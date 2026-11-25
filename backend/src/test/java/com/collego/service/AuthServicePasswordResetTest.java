package com.collego.service;

import com.collego.dto.ForgotPasswordRequest;
import com.collego.dto.ResetPasswordRequest;
import com.collego.entity.StudentProfile;
import com.collego.entity.User;
import com.collego.exception.BadRequestException;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.StudentProfileRepository;
import com.collego.repository.UserRepository;
import com.collego.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServicePasswordResetTest {

    @Mock private UserRepository userRepository;
    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private FacultyProfileRepository facultyProfileRepository;
    @Mock private JwtService jwtService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private AuditService auditService;
    @Mock private EmailService emailService;

    @InjectMocks private AuthService authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "passwordResetTtlMinutes", 30L);
    }

    @Test
    void forgotPasswordStoresOnlyHashAndEmailsOneTimeLink() {
        User user = User.builder()
                .id(1L)
                .email("student@collego.edu")
                .firstName("Asha")
                .lastName("Rao")
                .build();
        when(userRepository.findByEmailIgnoreCase("student@collego.edu")).thenReturn(Optional.of(user));
        when(emailService.frontendUrl()).thenReturn("https://collego.example");

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("  Student@Collego.edu  ");
        authService.forgotPassword(request);

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).send(eq("student@collego.edu"), eq("Collego password reset"), bodyCaptor.capture());
        String body = bodyCaptor.getValue();
        String linkLine = body.lines()
                .filter(line -> line.contains("/reset-password?token="))
                .findFirst()
                .orElseThrow();
        String rawToken = linkLine.substring(linkLine.indexOf("token=") + 6).trim();

        assertFalse(rawToken.isBlank());
        assertNotEquals(rawToken, user.getPasswordResetToken());
        assertEquals(sha256(rawToken), user.getPasswordResetToken());
        assertNotNull(user.getPasswordResetTokenExpiry());
        assertTrue(user.getPasswordResetTokenExpiry().isAfter(LocalDateTime.now()));
        verify(userRepository).save(user);
        verify(auditService).log(eq(1L), eq("student@collego.edu"),
                eq("PASSWORD_RESET_REQUEST"), anyString(), isNull());
    }

    @Test
    void forgotPasswordResolvesStudentUsnToRegisteredEmail() {
        User user = User.builder()
                .id(4L)
                .email("amithsk747@gmail.com")
                .firstName("Amith")
                .lastName("S K")
                .build();
        StudentProfile profile = StudentProfile.builder()
                .id(10L)
                .user(user)
                .enrollmentNumber("2BA23CS012")
                .build();
        when(studentProfileRepository.findAllByEnrollmentNumber("2BA23CS012"))
                .thenReturn(List.of(profile));
        when(emailService.frontendUrl()).thenReturn("https://collego.example");

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("  2ba23cs012  ");
        authService.forgotPassword(request);

        verify(userRepository, never()).findByEmailIgnoreCase(anyString());
        verify(emailService).send(eq("amithsk747@gmail.com"), eq("Collego password reset"),
                contains("/reset-password?token="));
        verify(auditService).log(eq(4L), eq("amithsk747@gmail.com"),
                eq("PASSWORD_RESET_REQUEST"), anyString(), isNull());
    }

    @Test
    void forgotPasswordPrefersDeliverableEmailWhenUsnIsDuplicated() {
        User seeded = User.builder()
                .id(5L)
                .email("student102.cse@collego.edu")
                .firstName("Udit")
                .lastName("Menon")
                .isActive(true)
                .createdAt(LocalDateTime.now().minusDays(2))
                .build();
        User real = User.builder()
                .id(6L)
                .email("amithsk747@gmail.com")
                .firstName("Amith")
                .lastName("S K")
                .isActive(false)
                .createdAt(LocalDateTime.now())
                .build();
        StudentProfile seededProfile = StudentProfile.builder()
                .id(11L).user(seeded).enrollmentNumber("2BA23CS012").build();
        StudentProfile realProfile = StudentProfile.builder()
                .id(12L).user(real).enrollmentNumber("2BA23CS012").build();
        when(studentProfileRepository.findAllByEnrollmentNumber("2BA23CS012"))
                .thenReturn(List.of(seededProfile, realProfile));
        when(emailService.frontendUrl()).thenReturn("https://collego.example");

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("2ba23cs012");
        authService.forgotPassword(request);

        verify(emailService).send(eq("amithsk747@gmail.com"), eq("Collego password reset"),
                contains("/reset-password?token="));
        verify(emailService, never()).send(eq("student102.cse@collego.edu"), anyString(), anyString());
        verify(auditService).log(eq(6L), eq("amithsk747@gmail.com"),
                eq("PASSWORD_RESET_REQUEST"), anyString(), isNull());
    }

    @Test
    void resetPasswordAcceptsRawTokenOnceAndClearsSessions() {
        String rawToken = "one-time-token";
        User user = User.builder()
                .id(2L)
                .email("faculty@collego.edu")
                .firstName("Sr")
                .lastName("Karjol")
                .passwordHash("old-hash")
                .refreshToken("refresh-token")
                .passwordResetToken(sha256(rawToken))
                .passwordResetTokenExpiry(LocalDateTime.now().plusMinutes(10))
                .build();
        when(userRepository.findByPasswordResetToken(sha256(rawToken))).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewPassword@123")).thenReturn("new-hash");

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken(rawToken);
        request.setNewPassword("NewPassword@123");
        authService.resetPassword(request);

        assertEquals("new-hash", user.getPasswordHash());
        assertNull(user.getPasswordResetToken());
        assertNull(user.getPasswordResetTokenExpiry());
        assertNull(user.getRefreshToken());
        verify(userRepository).save(user);
        verify(auditService).log(eq(2L), eq("faculty@collego.edu"),
                eq("PASSWORD_RESET"), anyString(), isNull());
    }

    @Test
    void resetPasswordRejectsExpiredTokenWithoutChangingPassword() {
        String rawToken = "expired-token";
        User user = User.builder()
                .id(3L)
                .email("expired@collego.edu")
                .firstName("Expired")
                .lastName("User")
                .passwordHash("old-hash")
                .passwordResetToken(sha256(rawToken))
                .passwordResetTokenExpiry(LocalDateTime.now().minusMinutes(1))
                .build();
        when(userRepository.findByPasswordResetToken(sha256(rawToken))).thenReturn(Optional.of(user));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken(rawToken);
        request.setNewPassword("NewPassword@123");

        assertThrows(BadRequestException.class, () -> authService.resetPassword(request));
        assertEquals("old-hash", user.getPasswordHash());
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPasswordRejectsUnknownToken() {
        when(userRepository.findByPasswordResetToken(anyString())).thenReturn(Optional.empty());

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("unknown-token");
        request.setNewPassword("NewPassword@123");

        assertThrows(BadRequestException.class, () -> authService.resetPassword(request));
        verify(userRepository, never()).save(any());
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
