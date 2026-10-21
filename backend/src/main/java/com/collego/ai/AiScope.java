package com.collego.ai;

import com.collego.entity.Role;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Phase 10: immutable, per-request authorization scope for the AI subsystem.
 *
 * <p>The AI layer never decides who the caller is. The {@link AiScope} is built
 * once from the verified JWT identity by {@link AiScopeFactory} and is the ONLY
 * source of user / student / section ids that may reach a query. Every tool
 * execution receives this object and must validate ids against it before
 * touching the database.
 *
 * <p>Deny by default: {@link #empty(String)} contains no ids and is not
 * unrestricted, so it allows nothing at all.
 *
 * <p>Passwords are never part of the AI surface. {@link #passwordAccess()} is
 * always {@code false} — even for admins — so no code path can read a stored
 * password through the AI subsystem without changing this class and failing
 * {@code AiScopeTest}.
 */
public record AiScope(
        Long userId,
        String email,
        Role role,
        boolean unrestricted,
        Set<Long> allowedStudentIds,
        Set<Long> allowedSectionIds,
        Set<Long> allowedCourseIds,
        boolean passwordAccess
) {

    public AiScope {
        allowedStudentIds = allowedStudentIds == null ? Set.of() : Set.copyOf(allowedStudentIds);
        allowedSectionIds = allowedSectionIds == null ? Set.of() : Set.copyOf(allowedSectionIds);
        allowedCourseIds = allowedCourseIds == null ? Set.of() : Set.copyOf(allowedCourseIds);
    }

    /** Scope that allows nothing. Used whenever the identity cannot be resolved. */
    public static AiScope empty(String email) {
        return new AiScope(null, email, null, false, Set.of(), Set.of(), Set.of(), false);
    }

    public static AiScope admin(Long userId, String email) {
        return new AiScope(userId, email, Role.ADMIN, true, Set.of(), Set.of(), Set.of(), false);
    }

    static AiScope of(Long userId, String email, Role role, boolean unrestricted,
                      Iterable<Long> studentIds, Iterable<Long> sectionIds, Iterable<Long> courseIds) {
        return new AiScope(userId, email, role, unrestricted,
                toSet(studentIds), toSet(sectionIds), toSet(courseIds), false);
    }

    public boolean allowsStudent(Long studentId) {
        return unrestricted || (studentId != null && allowedStudentIds.contains(studentId));
    }

    public boolean allowsSection(Long sectionId) {
        return unrestricted || (sectionId != null && allowedSectionIds.contains(sectionId));
    }

    public boolean allowsCourse(Long courseId) {
        return unrestricted || (courseId != null && allowedCourseIds.contains(courseId));
    }

    public boolean isStudent() {
        return role == Role.STUDENT;
    }

    public boolean isFaculty() {
        return role == Role.FACULTY;
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    public void requireStudent(Long studentId) {
        if (!allowsStudent(studentId)) throw denied("student record");
    }

    public void requireSection(Long sectionId) {
        if (!allowsSection(sectionId)) throw denied("section");
    }

    public void requireCourse(Long courseId) {
        if (!allowsCourse(courseId)) throw denied("course");
    }

    /** Safe, PII-free summary that may be handed to the model. */
    public String describe() {
        return "role=" + (role == null ? "UNKNOWN" : role.name())
                + " unrestricted=" + unrestricted
                + " ownStudents=" + (allowedStudentIds.isEmpty() ? "none" : allowedStudentIds.size())
                + " sections=" + (allowedSectionIds.isEmpty() ? "none" : allowedSectionIds.size())
                + " courses=" + (allowedCourseIds.isEmpty() ? "none" : allowedCourseIds.size())
                + " passwordAccess=false";
    }

    private AiAccessDeniedException denied(String what) {
        return new AiAccessDeniedException("AI scope does not allow access to that " + what);
    }

    private static Set<Long> toSet(Iterable<Long> ids) {
        Set<Long> out = new LinkedHashSet<>();
        if (ids != null) {
            for (Long id : ids) {
                if (id != null) out.add(id);
            }
        }
        return out;
    }
}
