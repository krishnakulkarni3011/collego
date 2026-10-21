package com.collego.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class JwtServiceTest {

    @InjectMocks
    private JwtService jwtService;

    @Test
    void accessAndRefreshTokens_shouldHaveDifferentTokenTypes() throws Exception {
        // Set required fields via reflection (no application.yml in test context)
        ReflectionTestUtils.setField(jwtService, "jwtSecret", "test-secret-key-that-is-at-least-256-bits-long!!!");
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiration", 900000L); // 15 min
        ReflectionTestUtils.setField(jwtService, "refreshTokenExpiration", 604800000L); // 7 days

        String accessToken = jwtService.generateAccessToken("user@collego.edu", "ADMIN");
        String refreshToken = jwtService.generateRefreshToken("user@collego.edu");

        // Access token should be identified as access
        assertTrue(jwtService.isAccessToken(accessToken), "Access token should have tokenType=access");
        assertFalse(jwtService.isRefreshToken(accessToken), "Access token should not be refresh");

        // Refresh token should be identified as refresh
        assertTrue(jwtService.isRefreshToken(refreshToken), "Refresh token should have tokenType=refresh");
        assertFalse(jwtService.isAccessToken(refreshToken), "Refresh token should not be access");

        // Emails should match
        assertEquals("user@collego.edu", jwtService.extractEmail(accessToken));
        assertEquals("user@collego.edu", jwtService.extractEmail(refreshToken));

        // Token types should be extractable
        assertEquals("access", jwtService.extractTokenType(accessToken));
        assertEquals("refresh", jwtService.extractTokenType(refreshToken));
    }

    @Test
    void accessToken_shouldNotBeUsableAsRefreshToken() throws Exception {
        ReflectionTestUtils.setField(jwtService, "jwtSecret", "test-secret-key-that-is-at-least-256-bits-long!!!");
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiration", 900000L);
        ReflectionTestUtils.setField(jwtService, "refreshTokenExpiration", 604800000L);

        String accessToken = jwtService.generateAccessToken("user@collego.edu", "STUDENT");
        assertFalse(jwtService.isRefreshToken(accessToken));
    }

    @Test
    void refreshToken_shouldNotBeUsableAsAccessToken() throws Exception {
        ReflectionTestUtils.setField(jwtService, "jwtSecret", "test-secret-key-that-is-at-least-256-bits-long!!!");
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiration", 900000L);
        ReflectionTestUtils.setField(jwtService, "refreshTokenExpiration", 604800000L);

        String refreshToken = jwtService.generateRefreshToken("user@collego.edu");
        assertFalse(jwtService.isAccessToken(refreshToken));
    }
}
