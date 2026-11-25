package com.collego.service;

import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.exception.UnauthorizedException;
import com.collego.repository.*;
import com.collego.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final AuditService auditService;
    private final EmailService emailService;

    @Value("${collego.security.password-reset-ttl-minutes:30}")
    private long passwordResetTtlMinutes;

    @Transactional
    public LoginResponse login(LoginRequest request, String ipAddress) {
        String cleanUsername = request.getUsername() != null ? request.getUsername().trim() : "";
        String cleanPassword = request.getPassword() != null ? request.getPassword().trim() : "";

        // Try to find user by email first
        User user = userRepository.findByEmailIgnoreCase(cleanUsername).orElse(null);

        // If not found by email, try USN (enrollmentNumber) for students.
        // USNs are stored upper-case, so accept lower-case input too.
        String normalizedUsn = cleanUsername.toUpperCase(java.util.Locale.ROOT);
        if (user == null && normalizedUsn.matches("\\d{1,2}[A-Z]{2}\\d{2}[A-Z]{2}\\d{3}")) {
            List<StudentProfile> students = studentProfileRepository.findAllByEnrollmentNumber(normalizedUsn);
            if (!students.isEmpty()) {
                // Duplicate USNs exist in legacy data. Prefer an active account
                // for sign-in, then the most recently created profile.
                user = selectStudentUser(students, false);
            }
        }

        // If still not found, try employee ID for faculty
        if (user == null && cleanUsername.matches("FAC-[A-Z]+-\\d{3}")) {
            FacultyProfile faculty = facultyProfileRepository.findByEmployeeId(cleanUsername).orElse(null);
            if (faculty != null) {
                user = faculty.getUser();
            }
        }

        if (user == null) {
            throw new BadCredentialsException("Invalid username/email/USN or password");
        }

        if (!user.isActive()) {
            throw new UnauthorizedException("Account is deactivated. Contact your administrator.");
        }

        // Authenticate using email (Spring Security uses email as principal)
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getEmail(), cleanPassword)
        );

        // Generate tokens
        String accessToken = jwtService.generateAccessToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail());

        // Store refresh token
        user.setRefreshToken(refreshToken);
        userRepository.save(user);

        // Audit log
        auditService.log(user.getId(), user.getEmail(), "LOGIN", "User logged in successfully", ipAddress);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .role(user.getRole().name())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .build();
    }

    @Transactional
    public LoginResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtService.isTokenValid(refreshToken)) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        // SECURITY FIX: Ensure the presented token is actually a refresh token,
        // not an access token being misused at the refresh endpoint.
        if (!jwtService.isRefreshToken(refreshToken)) {
            throw new UnauthorizedException("Access token cannot be used as a refresh token");
        }

        String email = jwtService.extractEmail(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        if (!refreshToken.equals(user.getRefreshToken())) {
            throw new UnauthorizedException("Refresh token does not match");
        }

        if (!user.isActive()) {
            throw new UnauthorizedException("Account is deactivated");
        }

        String newAccessToken = jwtService.generateAccessToken(user.getEmail(), user.getRole().name());
        String newRefreshToken = jwtService.generateRefreshToken(user.getEmail());

        user.setRefreshToken(newRefreshToken);
        userRepository.save(user);

        return LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .role(user.getRole().name())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .build();
    }

    @Transactional
    public void logout(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();
        if (refreshToken != null) {
            userRepository.findByRefreshToken(refreshToken).ifPresent(user -> {
                user.setRefreshToken(null);
                userRepository.save(user);
                auditService.log(user.getId(), user.getEmail(), "LOGOUT", "User logged out", null);
            });
        }
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String identifier = request.getEmail() != null ? request.getEmail().trim() : "";
        if (identifier.isEmpty()) {
            return;
        }

        User user = null;
        if (identifier.contains("@")) {
            user = userRepository.findByEmailIgnoreCase(
                    identifier.toLowerCase(java.util.Locale.ROOT)).orElse(null);
        } else {
            // Students can request a reset with their USN; the link always goes
            // to the email address stored on the matched account.
            String normalizedIdentifier = identifier.toUpperCase(java.util.Locale.ROOT);
            List<StudentProfile> students = studentProfileRepository
                    .findAllByEnrollmentNumber(normalizedIdentifier);
            if (!students.isEmpty()) {
                // If legacy data has duplicate USNs, prefer an account whose
                // email can actually receive mail, then an active account.
                user = selectStudentUser(students, true);
            } else {
                FacultyProfile faculty = facultyProfileRepository
                        .findByEmployeeId(normalizedIdentifier).orElse(null);
                if (faculty != null) {
                    user = faculty.getUser();
                }
            }
        }

        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            // Always return success to not reveal whether the account exists.
            return;
        }

        String resetToken = generateResetToken();
        user.setPasswordResetToken(sha256(resetToken));
        user.setPasswordResetTokenExpiry(LocalDateTime.now().plusMinutes(passwordResetTtlMinutes));
        userRepository.save(user);

        String resetLink = emailService.frontendUrl() + "/reset-password?token=" + resetToken;
        emailService.send(user.getEmail(), "Collego password reset",
                "Hello " + user.getFirstName() + ",\n\n"
                + "A password reset was requested for your Collego account.\n"
                + "Use the link below within " + passwordResetTtlMinutes + " minutes. "
                + "The link works only once:\n\n"
                + resetLink + "\n\n"
                + "If you did not request this, you can ignore this email.");

        // Visible in local development where mail is disabled; production logs at INFO.
        log.debug("Password reset link for {}: {}", user.getEmail(), resetLink);

        auditService.log(user.getId(), user.getEmail(), "PASSWORD_RESET_REQUEST",
                "Password reset requested", null);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String tokenHash = sha256(request.getToken().trim());
        User user = userRepository.findByPasswordResetToken(tokenHash)
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset token"));

        if (user.getPasswordResetTokenExpiry() == null
                || user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Reset token has expired");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        user.setRefreshToken(null); // Invalidate all sessions
        userRepository.save(user);

        auditService.log(user.getId(), user.getEmail(), "PASSWORD_RESET",
                "Password was reset successfully", null);
    }

    /**
     * Legacy seed data can contain more than one student profile for the same
     * USN. Pick a deterministic account instead of letting a non-unique query
     * fail with a 500.
     */
    private User selectStudentUser(List<StudentProfile> students, boolean preferDeliverableEmail) {
        Comparator<User> comparator = Comparator
                .comparing((User user) -> preferDeliverableEmail && isPlaceholderEmail(user.getEmail()))
                .thenComparing(user -> user.isActive(), Comparator.reverseOrder())
                .thenComparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()));

        return students.stream()
                .map(StudentProfile::getUser)
                .filter(Objects::nonNull)
                .filter(user -> user.getEmail() != null && !user.getEmail().isBlank())
                .min(comparator)
                .orElse(null);
    }

    private boolean isPlaceholderEmail(String email) {
        return email != null
                && email.toLowerCase(java.util.Locale.ROOT).endsWith("@collego.edu");
    }

    private String generateResetToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}