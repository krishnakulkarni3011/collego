package com.collego.ai;

import com.collego.entity.Enrollment;
import com.collego.entity.EnrollmentStatus;
import com.collego.entity.FacultyProfile;
import com.collego.entity.FacultySubjectAssignment;
import com.collego.entity.Role;
import com.collego.entity.Section;
import com.collego.entity.StudentProfile;
import com.collego.entity.User;
import com.collego.repository.EnrollmentRepository;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.FacultySubjectAssignmentRepository;
import com.collego.repository.SectionRepository;
import com.collego.repository.StudentProfileRepository;
import com.collego.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Phase 10: builds the {@link AiScope} for the authenticated caller.
 *
 * <p>This is the single place where AI authorization decisions are made, and it
 * is deny-by-default: an unknown user, a missing profile, or an unknown role all
 * produce {@link AiScope#empty(String)}, which allows no data at all.
 *
 * <p>Role rules (agreed with the project owner):
 * <ul>
 *   <li><b>STUDENT</b> — own record only.</li>
 *   <li><b>FACULTY</b> — only the sections they are assigned to (the same
 *       {@code section.faculty} relationship enforced by
 *       {@code FacultyController}/{@code FacultyPortalService}), the students
 *       enrolled in those sections, and the courses tied to them.</li>
 *   <li><b>ADMIN</b> — unrestricted data access, but {@code passwordAccess}
 *       stays false, so no password can ever be read through the AI path.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class AiScopeFactory {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SectionRepository sectionRepository;
    private final FacultySubjectAssignmentRepository facultySubjectAssignmentRepository;

    @Transactional(readOnly = true)
    public AiScope forUser(String email) {
        if (email == null || email.isBlank()) {
            log.warn("AI scope requested without an authenticated email");
            return AiScope.empty(email);
        }
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || user.getRole() == null) {
            log.warn("AI scope requested for unknown user {}", email);
            return AiScope.empty(email);
        }
        return switch (user.getRole()) {
            case STUDENT -> studentScope(user);
            case FACULTY -> facultyScope(user);
            case ADMIN -> AiScope.admin(user.getId(), user.getEmail());
        };
    }

    private AiScope studentScope(User user) {
        StudentProfile student = studentProfileRepository.findByUserId(user.getId()).orElse(null);
        if (student == null) {
            log.warn("Student profile missing for {}", user.getEmail());
            return AiScope.empty(user.getEmail());
        }

        Set<Long> sectionIds = new LinkedHashSet<>();
        Set<Long> courseIds = new LinkedHashSet<>();
        List<Enrollment> enrollments = enrollmentRepository.findByStudentIdAndStatus(
                student.getId(), EnrollmentStatus.ACTIVE);
        for (Enrollment enrollment : enrollments) {
            Section section = enrollment.getSection();
            if (section == null) continue;
            sectionIds.add(section.getId());
            if (section.getCourse() != null) courseIds.add(section.getCourse().getId());
        }

        return AiScope.of(user.getId(), user.getEmail(), Role.STUDENT, false,
                List.of(student.getId()), sectionIds, courseIds);
    }

    private AiScope facultyScope(User user) {
        FacultyProfile faculty = facultyProfileRepository.findByUserId(user.getId()).orElse(null);
        if (faculty == null) {
            log.warn("Faculty profile missing for {}", user.getEmail());
            return AiScope.empty(user.getEmail());
        }

        Set<Long> sectionIds = new LinkedHashSet<>();
        Set<Long> courseIds = new LinkedHashSet<>();

        // Source of truth = the same section ownership the faculty endpoints enforce.
        for (Section section : sectionRepository.findByFacultyId(faculty.getId())) {
            sectionIds.add(section.getId());
            if (section.getCourse() != null) courseIds.add(section.getCourse().getId());
        }

        // General info tied to what this faculty teaches, as agreed (D2).
        for (FacultySubjectAssignment assignment
                : facultySubjectAssignmentRepository.findByFacultyIdAndIsActiveTrue(faculty.getId())) {
            if (assignment.getCourse() != null && assignment.getCourse().getId() != null) {
                courseIds.add(assignment.getCourse().getId());
            }
        }

        Set<Long> studentIds = new LinkedHashSet<>();
        for (Long sectionId : sectionIds) {
            for (Enrollment enrollment : enrollmentRepository.findBySectionId(sectionId)) {
                if (enrollment.getStudent() != null) {
                    studentIds.add(enrollment.getStudent().getId());
                }
            }
        }

        return AiScope.of(user.getId(), user.getEmail(), Role.FACULTY, false,
                studentIds, sectionIds, courseIds);
    }
}
