package com.collego.ai;

import com.collego.dto.CgpaResponse;
import com.collego.dto.OverallAttendanceResponse;
import com.collego.dto.SubjectAttendanceResponse;
import com.collego.entity.StudentProfile;
import com.collego.entity.User;
import com.collego.repository.StudentProfileRepository;
import com.collego.repository.UserRepository;
import com.collego.service.AiService;
import com.collego.service.StudentPortalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Builds the caller's own academic payloads for the deterministic AI insights
 * (performance prediction, attendance risk, placement readiness) and calls the
 * ai-service.
 *
 * <p>Identity is always the authenticated email supplied by the caller; no
 * identifier from a request body or model argument is ever used here. A student
 * therefore can only ever be scored on their own record.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class AiStudentInsights {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentPortalService studentPortalService;
    private final AiService aiService;

    /** Feature 3: next-semester SGPA/CGPA projection for the caller. */
    public Map<String, Object> performancePrediction(String email) {
        return aiService.predictPerformance(performancePayload(email));
    }

    /** Feature 4: attendance early-warning for the caller. */
    public Map<String, Object> attendanceRisk(String email) {
        return aiService.attendanceRisk(attendanceRiskPayload(email));
    }

    /** Feature 6: placement readiness for the caller, with an optional request. */
    public Map<String, Object> placementAssistant(String email, Map<String, Object> body) {
        Map<String, Object> request = body == null ? new HashMap<>() : new HashMap<>(body);
        request.put("student", studentProfile(email));
        return aiService.placementAssistant(request);
    }

    /** Minimal, non-sensitive student profile used by the placement features. */
    public Map<String, Object> studentProfile(String email) {
        try {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) return Map.of("cgpa", 0.0);

            StudentProfile student = studentProfileRepository.findByUserId(user.getId()).orElse(null);
            double cgpa = 0.0;
            try {
                CgpaResponse cgpaResp = studentPortalService.calculateCgpa(email);
                cgpa = cgpaResp.getCumulativeCgpa();
            } catch (Exception ignored) {}

            Map<String, Object> profile = new HashMap<>();
            profile.put("cgpa", cgpa);
            profile.put("department", student != null && student.getDepartment() != null
                    ? student.getDepartment().getName() : "");
            profile.put("currentSemester", student != null ? student.getSemester() : 0);
            profile.put("skills", List.of());
            profile.put("interests", List.of());
            profile.put("hasBacklogs", false);
            return profile;
        } catch (Exception e) {
            log.warn("Student profile build failed: {}", e.getMessage());
            return Map.of("cgpa", 0.0, "skills", List.of(), "hasBacklogs", false);
        }
    }

    private Map<String, Object> performancePayload(String email) {
        try {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) return Map.of("semesterHistory", List.of());

            StudentProfile student = studentProfileRepository.findByUserId(user.getId()).orElse(null);
            if (student == null) return Map.of("semesterHistory", List.of());

            CgpaResponse cgpa = studentPortalService.calculateCgpa(email);
            List<Map<String, Object>> semHistory = cgpa.getSemesters().stream().map(sem -> {
                Map<String, Object> s = new HashMap<>();
                s.put("semesterNumber", sem.getSemesterNumber());
                s.put("sgpa", sem.getSgpa());
                s.put("totalCredits", sem.getTotalCredits());
                return s;
            }).collect(Collectors.toList());

            double attPct = 0;
            try {
                OverallAttendanceResponse att = studentPortalService.getOverallAttendance(email);
                attPct = att.getOverallPercentage();
            } catch (Exception ignored) {}

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("studentId", student.getId());
            payload.put("semesterHistory", semHistory);
            payload.put("currentAttendance", attPct);
            payload.put("currentSemester", student.getSemester());
            return payload;
        } catch (Exception e) {
            log.warn("Performance prediction payload build failed: {}", e.getMessage());
            return Map.of("semesterHistory", List.of());
        }
    }

    private Map<String, Object> attendanceRiskPayload(String email) {
        try {
            List<SubjectAttendanceResponse> subjectAtt = studentPortalService.getAttendance(email, null);
            List<Map<String, Object>> subjectData = new ArrayList<>();
            for (SubjectAttendanceResponse s : subjectAtt) {
                Map<String, Object> m = new HashMap<>();
                m.put("courseName", s.getCourseName());
                m.put("courseCode", s.getCourseCode());
                m.put("totalClasses", s.getTotalClasses());
                m.put("present", s.getPresent());
                m.put("percentage", s.getPercentage());
                subjectData.add(m);
            }
            return Map.of("subjectAttendance", subjectData);
        } catch (Exception e) {
            log.warn("Attendance risk payload build failed: {}", e.getMessage());
            return Map.of("subjectAttendance", List.of());
        }
    }
}
