package com.collego.ai;

import com.collego.entity.Role;
import com.collego.entity.User;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 10 (decision D3): the only user shape the AI may see is password-free.
 * Planned test H — an admin asking about a password must never receive one.
 */
class AiUserSummaryTest {

    private static User user() {
        return User.builder()
                .id(5L)
                .email("student@collego.edu")
                .firstName("Rahul")
                .lastName("Sharma")
                .role(Role.STUDENT)
                .passwordHash("$2a$10$supersecrethashvalue123456")
                .refreshToken("refresh-token-value")
                .passwordResetToken("reset-token-value")
                .isActive(true)
                .build();
    }

    @Test
    void projectionContainsNoCredentialFields() {
        Map<String, Object> map = AiUserSummary.from(user()).toMap();

        assertEquals(Set.of("id", "email", "firstName", "lastName", "role", "active"), map.keySet());
        assertFalse(map.containsKey("passwordHash"));
        assertFalse(map.containsKey("refreshToken"));
        assertFalse(map.containsKey("passwordResetToken"));
    }

    @Test
    void projectionContainsNoCredentialValues() {
        String serialised = AiUserSummary.from(user()).toMap().toString();

        assertFalse(serialised.contains("$2a$"), "no bcrypt hash may be exposed");
        assertFalse(serialised.contains("refresh-token-value"));
        assertFalse(serialised.contains("reset-token-value"));
        assertFalse(serialised.toLowerCase().contains("password"));
    }

    @Test
    void nullUserIsHandledSafely() {
        assertNull(AiUserSummary.from(null));
    }
}
