package com.collego.service;

import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.exception.UnauthorizedException;
import com.collego.repository.*;
import com.collego.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final AuditService auditService;

    @Transactional
    public LoginResponse login(LoginRequest request, String ipAddress) {
        String cleanUsername = request.getUsername() != null ? request.getUsername().trim() : "";
        String cleanPassword = request.getPassword() != null ? request.getPassword().trim() : "";

        User user = null;
        String loginIdentifier = cleanUsername;

        // Try to find user by email first
        user = userRepository.findByEmailIgnoreCase(cleanUsername).orElse(null);

        // If not found by email, try USN (enrollmentNumber) for students
        if (user == null && cleanUsername.matches("1CG\\d{2}CS\\d{3}")) {
            StudentProfile student = studentProfileRepository.findByEnrollmentNumber(cleanUsername).orElse(null);
            if (student != null) {
                user = student.getUser();
                loginIdentifier = user.getEmail(); // Use email for authentication
            }
        }

        // If still not found, try employee ID for faculty
        if (user == null && cleanUsername.matches("FAC-[A-Z]+-\\d{3}")) {
            FacultyProfile faculty = facultyProfileRepository.findByEmployeeId(cleanUsername).orElse(null);
            if (faculty != null) {
                user = faculty.getUser();
                loginIdentifier = user.getEmail(); // Use email for authentication
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
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            String resetToken = UUID.randomUUID().toString();
            user.setPasswordResetToken(resetToken);
            user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));
            userRepository.save(user);

            // Stub: Log the token instead of sending email
            log.info("PASSWORD RESET TOKEN for {}: {}", user.getEmail(), resetToken);

            auditService.log(user.getId(), user.getEmail(), "PASSWORD_RESET_REQUEST",
                    "Password reset requested", null);
        });
        // Always return success to not reveal whether email exists
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset token"));

        if (user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
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
}