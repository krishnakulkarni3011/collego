package com.collego.ai;

import com.collego.entity.Role;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 10: proves the per-role authorization contract.
 * Mirrors the planned isolation tests A (own data), B (cross-student) and D (faculty scope).
 */
class AiScopeTest {

    @Test
    void adminIsUnrestrictedButNeverHasPasswordAccess() {
        AiScope admin = AiScope.admin(1L, "admin@collego.edu");

        assertTrue(admin.allowsStudent(999L));
        assertTrue(admin.allowsSection(555L));
        assertTrue(admin.allowsCourse(42L));
        assertTrue(admin.isAdmin());

        // Decision D3: full data EXCEPT stored/updated passwords.
        assertFalse(admin.passwordAccess(), "admins must never read passwords through the AI path");
    }

    @Test
    void emptyScopeAllowsNothing() {
        AiScope empty = AiScope.empty("ghost@collego.edu");

        assertFalse(empty.allowsStudent(1L));
        assertFalse(empty.allowsSection(1L));
        assertFalse(empty.allowsCourse(1L));
        assertFalse(empty.isStudent());
        assertThrows(AiAccessDeniedException.class, () -> empty.requireStudent(1L));
        assertThrows(AiAccessDeniedException.class, () -> empty.requireSection(1L));
    }

    @Test
    void studentCanOnlyEverReadOwnRecord() {
        AiScope student = AiScope.of(10L, "s1@collego.edu", Role.STUDENT, false,
                List.of(100L), List.of(7L), List.of(3L));

        assertTrue(student.allowsStudent(100L), "student may read their own record");
        assertFalse(student.allowsStudent(101L), "student must never read another student's record");
        assertThrows(AiAccessDeniedException.class, () -> student.requireStudent(101L));

        assertTrue(student.allowsSection(7L));
        assertFalse(student.allowsSection(8L));
        assertFalse(student.passwordAccess());
    }

    @Test
    void facultyIsLimitedToAssignedSectionsAndTheirStudents() {
        AiScope faculty = AiScope.of(20L, "f1@collego.edu", Role.FACULTY, false,
                Set.of(100L, 101L), Set.of(7L), Set.of(3L));

        assertTrue(faculty.isFaculty());
        assertTrue(faculty.allowsStudent(100L));
        assertFalse(faculty.allowsStudent(999L), "faculty must not read students outside their sections");
        assertThrows(AiAccessDeniedException.class, () -> faculty.requireStudent(999L));

        assertTrue(faculty.allowsSection(7L));
        assertThrows(AiAccessDeniedException.class, () -> faculty.requireSection(99L));
        assertFalse(faculty.passwordAccess());
    }

    @Test
    void nullIdsAreNeverAllowed() {
        AiScope faculty = AiScope.of(20L, "f1@collego.edu", Role.FACULTY, false,
                Set.of(100L), Set.of(7L), Set.of(3L));

        assertFalse(faculty.allowsStudent(null));
        assertFalse(faculty.allowsSection(null));
        assertFalse(faculty.allowsCourse(null));
    }

    @Test
    void describeIsSafeForThePrompt() {
        AiScope student = AiScope.of(10L, "s1@collego.edu", Role.STUDENT, false,
                List.of(100L), List.of(7L), List.of(3L));

        String description = student.describe();
        assertTrue(description.contains("role=STUDENT"));
        assertTrue(description.contains("passwordAccess=false"));
        assertFalse(description.contains("s1@collego.edu"), "no PII in the prompt hint");
    }
}
