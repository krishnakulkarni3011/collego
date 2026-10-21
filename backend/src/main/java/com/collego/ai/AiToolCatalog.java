package com.collego.ai;

import com.collego.entity.AttendanceStatus;
import com.collego.entity.Enrollment;
import com.collego.entity.FacultyProfile;
import com.collego.entity.Role;
import com.collego.entity.Section;
import com.collego.entity.StudentProfile;
import com.collego.entity.User;
import com.collego.repository.AttendanceRepository;
import com.collego.repository.EnrollmentRepository;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.SectionRepository;
import com.collego.repository.StudentProfileRepository;
import com.collego.repository.UserRepository;
import com.collego.service.StudentPortalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Phase 10: the concrete tool catalog.
 *
 * <p>Rules every tool in this class follows:
 * <ul>
 *   <li>identity always comes from {@link AiScope}, never from model arguments;</li>
 *   <li>any {@code studentId}/{@code sectionId} the model supplies is validated
 *       against the scope before a query runs, via {@code requireStudent} /
 *       {@code requireSection};</li>
 *   <li>results are flat maps or flat DTOs — never JPA entities, because
 *       {@code User} carries passwordHash / refreshToken / passwordResetToken;</li>
 *   <li>result sizes are bounded so a local model is not flooded with context.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class AiToolCatalog {

    private static final int MAX_LIST = 25;

    private final StudentPortalService studentPortalService;
    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final SectionRepository sectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final AiRagService aiRagService;

    public List<AiTool> tools() {
        List<AiTool> tools = new ArrayList<>();

        // ── Caller identity / own record ────────────────────────────────────────
        tools.add(new SimpleAiTool("get_my_account",
                "Who the asker is: name, email, role. Use this when the user asks what you know about them.",
                Set.of(Role.STUDENT, Role.FACULTY, Role.ADMIN), noArgs(),
                (scope, args) -> {
                    if (scope.userId() == null) return Map.of("error", "account_not_found");
                    User user = userRepository.findById(scope.userId()).orElse(null);
                    AiUserSummary summary = AiUserSummary.from(user);
                    return summary == null ? Map.of("error", "account_not_found") : summary.toMap();
                }));

        // ── Student tools ───────────────────────────────────────────────────────
        tools.add(new SimpleAiTool("get_my_profile",
                "The asker's own student profile: name, enrolment number, department, semester and section.",
                Set.of(Role.STUDENT), noArgs(),
                (scope, args) -> studentPortalService.getProfile(scope.email())));

        tools.add(new SimpleAiTool("get_my_attendance",
                "The asker's own attendance: overall percentage plus a subject-wise breakdown.",
                Set.of(Role.STUDENT), noArgs(),
                (scope, args) -> studentPortalService.getOverallAttendance(scope.email())));

        tools.add(new SimpleAiTool("get_my_cgpa",
                "The asker's own CGPA/SGPA with a semester-wise breakdown.",
                Set.of(Role.STUDENT), noArgs(),
                (scope, args) -> studentPortalService.calculateCgpa(scope.email())));

        tools.add(new SimpleAiTool("get_my_timetable",
                "The asker's own weekly class timetable with days, timings, rooms and faculty names.",
                Set.of(Role.STUDENT), noArgs(),
                (scope, args) -> studentPortalService.getTimetable(scope.email())));

        tools.add(new SimpleAiTool("get_my_internal_marks",
                "The asker's own internal/continuous assessment marks per subject.",
                Set.of(Role.STUDENT), noArgs(),
                (scope, args) -> studentPortalService.getInternalMarks(scope.email(), null)));

        tools.add(new SimpleAiTool("get_my_semester_marks",
                "The asker's own end-semester marks and grades per subject.",
                Set.of(Role.STUDENT), noArgs(),
                (scope, args) -> studentPortalService.getSemesterMarks(scope.email(), null)));

        tools.add(new SimpleAiTool("get_my_assignments",
                "The asker's own assignments with subject, due date and submission status.",
                Set.of(Role.STUDENT), noArgs(),
                (scope, args) -> cap(studentPortalService.getAssignmentsForStudent(scope.email()))));

        tools.add(new SimpleAiTool("get_my_notifications",
                "The asker's own notifications and notices.",
                Set.of(Role.STUDENT), noArgs(),
                (scope, args) -> cap(studentPortalService.getNotifications(scope.email()))));

        tools.add(new SimpleAiTool("get_my_placement_notices",
                "Placement drives and company notices visible to the asker.",
                Set.of(Role.STUDENT), noArgs(),
                (scope, args) -> cap(studentPortalService.getPlacementNotices(scope.email()))));

        tools.add(new SimpleAiTool("get_my_question_papers",
                "Previous-year question papers available to the asker.",
                Set.of(Role.STUDENT), noArgs(),
                (scope, args) -> cap(studentPortalService.getQuestionPapers(scope.email()))));

        tools.add(new SimpleAiTool("search_my_study_material",
                "Search the asker's own course materials, question papers, notices and placement "
                        + "announcements for study-related questions. Returns the most relevant items.",
                Set.of(Role.STUDENT), oneString("query", "What the asker is looking for."),
                (scope, args) -> aiRagService.retrieve(scope, stringArg(args, "query"), 4)));

        // ── Faculty tools (assigned sections only) ──────────────────────────────
        tools.add(new SimpleAiTool("get_my_sections",
                "The sections the caller is responsible for, with course and semester details.",
                Set.of(Role.FACULTY, Role.ADMIN), noArgs(),
                (scope, args) -> listSections(scope)));

        tools.add(new SimpleAiTool("get_section_roster",
                "Students enrolled in one of the caller's sections. Requires a sectionId from get_my_sections.",
                Set.of(Role.FACULTY, Role.ADMIN), oneLong("sectionId", "Section id obtained from get_my_sections."),
                (scope, args) -> sectionRoster(scope, longArg(args, "sectionId"))));

        tools.add(new SimpleAiTool("get_section_attendance_summary",
                "Per-student attendance counts and percentages for one of the caller's sections.",
                Set.of(Role.FACULTY, Role.ADMIN), oneLong("sectionId", "Section id obtained from get_my_sections."),
                (scope, args) -> sectionAttendance(scope, longArg(args, "sectionId"))));

        tools.add(new SimpleAiTool("get_student_academic_summary",
                "Academic summary (CGPA, attendance, department, semester) for a student the caller is "
                        + "allowed to see. Students may only request their own id.",
                Set.of(Role.FACULTY, Role.ADMIN, Role.STUDENT),
                oneLong("studentId", "Student profile id."),
                (scope, args) -> studentSummary(scope, longArg(args, "studentId"))));

        return tools;
    }

    // ── Tool implementations ───────────────────────────────────────────────────

    private Object listSections(AiScope scope) {
        List<Section> sections;
        if (scope.isFaculty()) {
            FacultyProfile faculty = facultyProfileRepository.findByUserId(scope.userId()).orElse(null);
            if (faculty == null) return List.of();
            sections = sectionRepository.findByFacultyId(faculty.getId());
        } else {
            sections = sectionRepository.findAll();
        }

        List<Map<String, Object>> out = new ArrayList<>();
        for (Section section : sections) {
            if (!scope.allowsSection(section.getId())) continue;
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("sectionId", section.getId());
            map.put("sectionName", section.getName());
            if (section.getCourse() != null) {
                map.put("courseName", section.getCourse().getName());
                map.put("courseCode", section.getCourse().getCode());
            }
            if (section.getSemester() != null) {
                map.put("semesterNumber", section.getSemester().getNumber());
                map.put("academicYear", section.getSemester().getAcademicYear());
            }
            out.add(map);
            if (out.size() >= MAX_LIST) break;
        }
        return out;
    }

    private Object sectionRoster(AiScope scope, Long sectionId) {
        scope.requireSection(sectionId);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Enrollment enrollment : enrollmentRepository.findBySectionId(sectionId)) {
            StudentProfile student = enrollment.getStudent();
            if (student == null) continue;
            scope.requireStudent(student.getId());
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("studentId", student.getId());
            map.put("enrollmentNumber", student.getEnrollmentNumber());
            map.put("semester", student.getSemester());
            User user = student.getUser();
            if (user != null) {
                map.put("name", (user.getFirstName() + " " + user.getLastName()).trim());
            }
            out.add(map);
            if (out.size() >= 100) break;
        }
        return out;
    }

    private Object sectionAttendance(AiScope scope, Long sectionId) {
        scope.requireSection(sectionId);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Enrollment enrollment : enrollmentRepository.findBySectionId(sectionId)) {
            StudentProfile student = enrollment.getStudent();
            if (student == null) continue;
            scope.requireStudent(student.getId());

            long total = attendanceRepository.countByStudentIdAndSectionId(student.getId(), sectionId);
            long present = attendanceRepository.countByStudentIdAndSectionIdAndStatus(
                    student.getId(), sectionId, AttendanceStatus.PRESENT);

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("studentId", student.getId());
            map.put("enrollmentNumber", student.getEnrollmentNumber());
            map.put("totalClasses", total);
            map.put("present", present);
            map.put("percentage", total > 0 ? Math.round((present * 10000.0) / total) / 100.0 : 0.0);
            out.add(map);
            if (out.size() >= 100) break;
        }
        return out;
    }

    private Object studentSummary(AiScope scope, Long studentId) {
        scope.requireStudent(studentId);

        StudentProfile student = studentProfileRepository.findById(studentId).orElse(null);
        if (student == null) return Map.of("error", "student_not_found");

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("studentId", student.getId());
        map.put("enrollmentNumber", student.getEnrollmentNumber());
        map.put("semester", student.getSemester());
        map.put("section", student.getSection());
        if (student.getDepartment() != null) {
            map.put("department", student.getDepartment().getName());
        }

        User user = student.getUser();
        if (user != null) {
            map.put("name", (user.getFirstName() + " " + user.getLastName()).trim());
            try {
                map.put("cgpa", studentPortalService.calculateCgpa(user.getEmail()).getCumulativeCgpa());
            } catch (Exception e) {
                log.debug("CGPA unavailable for student {}: {}", studentId, e.getMessage());
            }
            try {
                map.put("attendancePercentage",
                        studentPortalService.getOverallAttendance(user.getEmail()).getOverallPercentage());
            } catch (Exception e) {
                log.debug("Attendance unavailable for student {}: {}", studentId, e.getMessage());
            }
        }
        return map;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static List<?> cap(List<?> list) {
        if (list == null) return List.of();
        return list.size() > MAX_LIST ? new ArrayList<>(list.subList(0, MAX_LIST)) : list;
    }

    private static Long longArg(Map<String, Object> args, String name) {
        if (args == null) return null;
        Object value = args.get(name);
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String stringArg(Map<String, Object> args, String name) {
        if (args == null) return "";
        Object value = args.get(name);
        return value == null ? "" : String.valueOf(value);
    }

    private static Map<String, Object> noArgs() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", Map.of());
        schema.put("required", List.of());
        return schema;
    }

    private static Map<String, Object> oneLong(String name, String description) {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put(name, Map.of("type", "integer", "description", description));
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        schema.put("required", List.of(name));
        return schema;
    }

    private static Map<String, Object> oneString(String name, String description) {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put(name, Map.of("type", "string", "description", description));
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        schema.put("required", List.of(name));
        return schema;
    }
}
