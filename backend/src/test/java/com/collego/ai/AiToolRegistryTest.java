package com.collego.ai;

import com.collego.entity.Role;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Phase 10: tools are filtered by role when advertised AND when executed, so a
 * hallucinated or out-of-role tool name can never run.
 */
class AiToolRegistryTest {

    private static AiTool tool(String name, Set<Role> roles) {
        return new SimpleAiTool(name, name + " description", roles,
                Map.of("type", "object"), (scope, args) -> Map.of("ok", true));
    }

    private static AiToolRegistry registry() {
        AiToolCatalog catalog = mock(AiToolCatalog.class);
        when(catalog.tools()).thenReturn(List.of(
                tool("get_my_attendance", Set.of(Role.STUDENT)),
                tool("get_section_roster", Set.of(Role.FACULTY, Role.ADMIN))));
        return new AiToolRegistry(catalog);
    }

    private static List<String> names(List<Map<String, Object>> descriptors) {
        return descriptors.stream().map(d -> String.valueOf(d.get("name"))).collect(Collectors.toList());
    }

    @Test
    void advertisesOnlyRoleAppropriateTools() {
        AiToolRegistry registry = registry();

        assertEquals(List.of("get_my_attendance"), names(registry.descriptors(Role.STUDENT)));
        assertEquals(List.of("get_section_roster"), names(registry.descriptors(Role.FACULTY)));
        // Admin only gets the tools whose roles include ADMIN — student-only
        // tools are never advertised, because an admin has no student record.
        assertEquals(List.of("get_section_roster"), names(registry.descriptors(Role.ADMIN)));
    }

    @Test
    void unknownRoleGetsNoTools() {
        assertTrue(registry().descriptors(null).isEmpty());
    }

    @Test
    void deniesUnknownToolNames() {
        assertThrows(AiAccessDeniedException.class,
                () -> registry().require("drop_all_tables", Role.ADMIN));
    }

    @Test
    void deniesToolForTheWrongRole() {
        assertThrows(AiAccessDeniedException.class,
                () -> registry().require("get_section_roster", Role.STUDENT));
        assertThrows(AiAccessDeniedException.class,
                () -> registry().require("get_my_attendance", Role.FACULTY));
    }

    @Test
    void resolvesAllowedTools() {
        AiTool tool = registry().require("get_my_attendance", Role.STUDENT);
        assertEquals("get_my_attendance", tool.name());
        assertEquals(Map.of("ok", true), tool.execute(null, Map.of()));
    }
}
