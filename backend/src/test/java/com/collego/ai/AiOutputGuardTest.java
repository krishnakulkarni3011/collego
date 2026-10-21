package com.collego.ai;

import com.collego.entity.Role;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 10: proves the output guard blocks secrets and cross-user leakage
 * (planned tests H and C).
 */
class AiOutputGuardTest {

    private static AiScope student() {
        return AiScope.of(10L, "s1@collego.edu", Role.STUDENT, false,
                List.of(100L), List.of(7L), List.of(3L));
    }

    private static AiScope admin() {
        return AiScope.admin(1L, "admin@collego.edu");
    }

    @Test
    void blocksBcryptHashes() {
        String text = "Here is the stored value: $2a$10$abcdefghijklmnopqrstuv";
        assertNotNull(AiOutputGuard.detect(admin(), text, Set.of()));
    }

    @Test
    void blocksTokenLikeStrings() {
        String text = "token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij";
        assertNotNull(AiOutputGuard.detect(admin(), text, Set.of()));
    }

    @Test
    void blocksCredentialShapedKeys() {
        assertNotNull(AiOutputGuard.detect(admin(), "{\"passwordHash\":\"abc\"}", Set.of()));
        assertNotNull(AiOutputGuard.detect(admin(), "{\"password\":\"abc\"}", Set.of()));
        assertNotNull(AiOutputGuard.detect(admin(), "refreshToken=abc", Set.of()));
    }

    @Test
    void allowsThePasswordRefusalWording() {
        // The model is expected to say this — it must not be blocked.
        String text = "Passwords are stored as one-way hashes and cannot be shown.";
        assertNull(AiOutputGuard.detect(admin(), text, Set.of()));
    }

    @Test
    void blocksAnotherStudentsEmailForAStudent() {
        String text = "Rahul's attendance is 91% (rahul@collego.edu).";
        assertEquals("cross-user email address in AI output",
                AiOutputGuard.detect(student(), text, Set.of()));
    }

    @Test
    void allowsOwnAndFacultyEmailsForAStudent() {
        String text = "Your attendance is 82%. Your mentor is prof.shama@collego.edu.";
        assertNull(AiOutputGuard.detect(student(), text, Set.of("prof.shama@collego.edu")));
    }

    @Test
    void adminIsNotEmailRestricted() {
        assertNull(AiOutputGuard.detect(admin(), "Contact rahul@collego.edu", Set.of()));
    }

    @Test
    void normalGroundedAnswerPasses() {
        String text = "Your overall attendance is 82.5% (33/40 classes) and your CGPA is 8.4.";
        assertNull(AiOutputGuard.detect(student(), text, Set.of()));
    }
}
