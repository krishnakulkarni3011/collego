package com.collego.ai;

import com.collego.entity.Role;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.function.BiFunction;

/**
 * Phase 10: a single callable data tool exposed to the LLM.
 *
 * <p>The model chooses <em>which</em> tool to call and with which arguments, but
 * it can never supply an identity: tools read the caller's id from the
 * {@link AiScope} handed to {@link #execute(AiScope, Map)}. Every implementation
 * must validate any caller-supplied {@code studentId} / {@code sectionId} /
 * {@code courseId} against the scope before touching the database.
 */
public interface AiTool {

    String name();

    String description();

    /** Roles allowed to use this tool. Enforced at descriptor-build AND execution time. */
    Set<Role> roles();

    /** JSON-schema object describing the accepted arguments. */
    Map<String, Object> parameters();

    Object execute(AiScope scope, Map<String, Object> arguments);

    default boolean supports(Role role) {
        return role != null && roles().contains(role);
    }

    default Map<String, Object> descriptor() {
        Map<String, Object> descriptor = new LinkedHashMap<>();
        descriptor.put("name", name());
        descriptor.put("description", description());
        descriptor.put("parameters", parameters());
        return descriptor;
    }
}
