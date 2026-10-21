package com.collego.ai;

import com.collego.entity.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 10: integration test — proves the whole AI isolation layer actually wires
 * up inside the real Spring context and exposes the right tools per role.
 *
 * <p>Runs on the H2 profile so no PostgreSQL is needed. This catches bean-wiring
 * mistakes that unit tests cannot (e.g. a tool catalog dependency that does not
 * resolve), and proves the role-filtering contract end to end.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("h2")
class AiWiringTest {

    @Autowired private AiScopeFactory aiScopeFactory;
    @Autowired private AiToolCatalog aiToolCatalog;
    @Autowired private AiToolRegistry aiToolRegistry;
    @Autowired private AiChatOrchestrator aiChatOrchestrator;
    @Autowired private AiOutputGuard aiOutputGuard;
    @Autowired private AiAuditLogger aiAuditLogger;
    @Autowired private AiRateLimiter aiRateLimiter;
    @Autowired private AiResponseCache aiResponseCache;
    @Autowired private AiRagService aiRagService;

    private static List<String> names(List<Map<String, Object>> descriptors) {
        return descriptors.stream().map(d -> String.valueOf(d.get("name"))).collect(Collectors.toList());
    }

    @Test
    void everyAiBeanIsPresent() {
        assertNotNull(aiScopeFactory);
        assertNotNull(aiToolCatalog);
        assertNotNull(aiToolRegistry);
        assertNotNull(aiChatOrchestrator);
        assertNotNull(aiOutputGuard);
        assertNotNull(aiAuditLogger);
        assertNotNull(aiRateLimiter);
        assertNotNull(aiResponseCache);
        assertNotNull(aiRagService);
    }

    @Test
    void studentToolsDoNotIncludeFacultyOrAdminTools() {
        List<String> student = names(aiToolRegistry.descriptors(Role.STUDENT));

        assertTrue(student.contains("get_my_attendance"));
        assertTrue(student.contains("get_my_cgpa"));
        assertTrue(student.contains("search_my_study_material"));

        // A student must never be offered section-wide or cohort-wide tools.
        assertFalse(student.contains("get_section_roster"), "students must not get section tools");
        assertFalse(student.contains("get_my_sections"), "students must not get faculty tools");
        assertFalse(student.contains("get_section_attendance_summary"));
    }

    @Test
    void facultyToolsDoNotIncludeOtherRolesTools() {
        List<String> faculty = names(aiToolRegistry.descriptors(Role.FACULTY));

        assertTrue(faculty.contains("get_my_sections"));
        assertTrue(faculty.contains("get_section_roster"));
        assertTrue(faculty.contains("get_section_attendance_summary"));

        // Student-only self-service tools are not offered to faculty.
        assertFalse(faculty.contains("get_my_attendance"));
        assertFalse(faculty.contains("get_my_cgpa"));
        assertFalse(faculty.contains("search_my_study_material"));
    }

    @Test
    void adminGetsDataToolsButNoStudentHonestlyScopedTools() {
        List<String> admin = names(aiToolRegistry.descriptors(Role.ADMIN));

        assertTrue(admin.contains("get_student_academic_summary"));
        assertTrue(admin.contains("get_section_roster"));
        assertFalse(admin.contains("get_my_attendance"), "admin has no student record of their own");
    }

    @Test
    void everyToolDeclaresAtLeastOneRoleAndASchema() {
        assertFalse(aiToolCatalog.tools().isEmpty());
        for (AiTool tool : aiToolCatalog.tools()) {
            assertFalse(tool.roles().isEmpty(), tool.name() + " declares no roles");
            assertNotNull(tool.parameters(), tool.name() + " has no parameter schema");
            assertEquals("object", tool.parameters().get("type"), tool.name() + " schema is not an object");
        }
    }

    @Test
    void noToolSchemaOrToolNameMentionsCredentials() {
        for (AiTool tool : aiToolCatalog.tools()) {
            String blob = (tool.name() + " " + tool.description() + " " + tool.parameters()).toLowerCase();
            assertFalse(blob.contains("password"), tool.name() + " mentions a password");
            assertFalse(blob.contains("token"), tool.name() + " mentions a token");
            assertFalse(blob.contains("hash"), tool.name() + " mentions a hash");
        }
    }

    @Test
    void unknownUserGetsADenyingScope() {
        AiScope scope = aiScopeFactory.forUser("nobody@collego.edu");

        assertFalse(scope.isStudent());
        assertFalse(scope.isFaculty());
        assertFalse(scope.isAdmin());
        assertFalse(scope.unrestricted());
        assertFalse(scope.allowsStudent(1L));
        assertFalse(scope.allowsSection(1L));
        assertFalse(scope.passwordAccess());
        assertThrows(AiAccessDeniedException.class, () -> scope.requireStudent(1L));
    }

    @Test
    void blankIdentityGetsADenyingScope() {
        AiScope scope = aiScopeFactory.forUser("   ");
        assertFalse(scope.unrestricted());
        assertNull(scope.userId());
        assertFalse(scope.passwordAccess());
    }

    @Test
    void toolExecutionIsRefusedForTheWrongRole() {
        assertThrows(AiAccessDeniedException.class,
                () -> aiToolRegistry.require("get_section_roster", Role.STUDENT));
        assertThrows(AiAccessDeniedException.class,
                () -> aiToolRegistry.require("get_my_attendance", Role.FACULTY));
    }
}
