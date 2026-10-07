package com.collego.controller;

import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.repository.*;
import com.collego.service.AiService;
import com.collego.service.StudentPortalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Phase 9: AI Controller — exposes all 9 AI features to the React frontend.
 *
 * All endpoints require authentication (JWT).
 * Role-specific endpoints add @PreAuthorize guards.
 *
 * Base path: /api/ai
 *
 * Endpoints:
 *   GET  /api/ai/health                     — ai-service health passthrough
 *   POST /api/ai/chat                       — Feature 1: AI College Assistant chatbot
 *   POST /api/ai/smart-search               — Feature 2: Smart Search intent classification
 *   GET  /api/ai/performance-prediction     — Feature 3: Student CGPA/SGPA prediction (student only)
 *   GET  /api/ai/attendance-risk            — Feature 4: Attendance risk early-warning (student only)
 *   POST /api/ai/resume-analyze             — Feature 5: Resume ATS analyzer (student only)
 *   POST /api/ai/placement-assistant        — Feature 6: Placement recommendations + mock interviews
 *   POST /api/ai/summarize-notice           — Feature 7: Summarize a notice
 *   GET  /api/ai/question-paper-insights    — Feature 8: QP topic weightage for a course
 *   POST /api/ai/generate-notice            — Feature 9: AI email/notice generator (faculty only)
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AiController {

    private final AiService aiService;
    private final StudentPortalService studentPortalService;

    // Repositories for fetching context data to pass to AI
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final InternalMarksRepository internalMarksRepository;
    private final SemesterMarksRepository semesterMarksRepository;
    private final SemesterRepository semesterRepository;
    private final QuestionPaperRepository questionPaperRepository;

    // ── Health ─────────────────────────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> aiHealth() {
        return ResponseEntity.ok(aiService.health());
    }

    // ── Feature 1: AI Chat ─────────────────────────────────────────────────────

    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(
            Authentication auth,
            @RequestBody Map<String, Object> body) {
        String message = (String) body.getOrDefault("message", "");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> history = (List<Map<String, String>>) body.getOrDefault("history", List.of());

        // Build context from student/user data so the AI gives personalized answers
        Map<String, Object> context = buildUserContext(auth.getName());

        return ResponseEntity.ok(aiService.chat(message, history, context));
    }

    // ── Feature 2: Smart Search ────────────────────────────────────────────────

    @PostMapping("/smart-search")
    public ResponseEntity<Map<String, Object>> smartSearch(@RequestBody Map<String, Object> body) {
        String query = (String) body.getOrDefault("query", "");
        return ResponseEntity.ok(aiService.smartSearch(query));
    }

    // ── Feature 3: Performance Prediction (Student only) ───────────────────────

    @GetMapping("/performance-prediction")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> performancePrediction(Authentication auth) {
        String email = auth.getName();
        Map<String, Object> request = buildPerformancePredictionPayload(email);
        return ResponseEntity.ok(aiService.predictPerformance(request));
    }

    // ── Feature 4: Attendance Risk (Student only) ──────────────────────────────

    @GetMapping("/attendance-risk")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> attendanceRisk(Authentication auth) {
        String email = auth.getName();
        Map<String, Object> request = buildAttendanceRiskPayload(email);
        return ResponseEntity.ok(aiService.attendanceRisk(request));
    }

    // ── Feature 5: Resume Analyzer ─────────────────────────────────────────────

    @PostMapping("/resume-analyze")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> analyzeResume(
            Authentication auth,
            @RequestBody Map<String, Object> body) {
        String resumeText = (String) body.getOrDefault("resumeText", "");
        String targetRole = (String) body.get("targetRole");
        Map<String, Object> profile = buildStudentProfileForPlacement(auth.getName());
        return ResponseEntity.ok(aiService.analyzeResume(resumeText, targetRole, profile));
    }

    // ── Feature 6: Placement Assistant ────────────────────────────────────────

    @PostMapping("/placement-assistant")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'FACULTY')")
    public ResponseEntity<Map<String, Object>> placementAssistant(
            Authentication auth,
            @RequestBody Map<String, Object> body) {
        // Merge student profile from DB into request
        Map<String, Object> studentProfile = buildStudentProfileForPlacement(auth.getName());
        Map<String, Object> request = new HashMap<>(body);
        request.put("student", studentProfile);
        return ResponseEntity.ok(aiService.placementAssistant(request));
    }

    // ── Feature 7: Notice Summarizer ──────────────────────────────────────────

    @PostMapping("/summarize-notice")
    public ResponseEntity<Map<String, Object>> summarizeNotice(@RequestBody Map<String, Object> body) {
        String title = (String) body.getOrDefault("title", "");
        String content = (String) body.getOrDefault("content", "");
        return ResponseEntity.ok(aiService.summarizeNotice(title, content));
    }

    // ── Feature 8: Question Paper Insights ────────────────────────────────────

    @GetMapping("/question-paper-insights")
    public ResponseEntity<Map<String, Object>> questionPaperInsights(
            @RequestParam Long courseId,
            @RequestParam(required = false) String courseCode,
            @RequestParam(required = false) String courseName) {

        // Load question papers from DB for this course
        List<QuestionPaper> papers = questionPaperRepository.searchApproved(
                courseId, null, null, null, null);

        List<Map<String, Object>> papersData = papers.stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("year", p.getYear());
            m.put("examType", p.getExamType() != null ? p.getExamType() : "UNKNOWN");
            m.put("courseName", p.getCourse().getName());
            // topics list — extracted from filename/description as simple heuristic
            m.put("topics", List.of());
            m.put("content", "");
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> request = new HashMap<>();
        request.put("courseCode", courseCode != null ? courseCode : "");
        request.put("courseName", courseName != null ? courseName : "");
        request.put("questionPapers", papersData);

        return ResponseEntity.ok(aiService.questionPaperInsights(request));
    }

    // ── Feature 9: AI Notice/Email Generator (Faculty only) ──────────────────

    @PostMapping("/generate-notice")
    @PreAuthorize("hasAnyRole('FACULTY', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> generateNotice(@RequestBody Map<String, Object> body) {
        String prompt = (String) body.getOrDefault("prompt", "");
        String audience = (String) body.getOrDefault("audience", "students");
        String noticeType = (String) body.getOrDefault("noticeType", "GENERAL");
        return ResponseEntity.ok(aiService.generateNotice(prompt, audience, noticeType));
    }

    // ── Context builders ───────────────────────────────────────────────────────

    /**
     * Builds a context map containing the user's live college data
     * for the RAG chatbot (Feature 1).
     */
    private Map<String, Object> buildUserContext(String email) {
        try {
            Map<String, Object> ctx = new HashMap<>();
            // Use existing service methods to build context
            try {
                ctx.put("attendance", studentPortalService.getOverallAttendance(email));
            } catch (Exception ignored) {}
            try {
                ctx.put("cgpa", studentPortalService.calculateCgpa(email));
            } catch (Exception ignored) {}
            try {
                List<FeeResponse> fees = studentPortalService.getFees(email);
                ctx.put("fees", fees);
                ctx.put("pendingFees", fees.stream().filter(f -> "PENDING".equals(f.getStatus())).count());
            } catch (Exception ignored) {}
            try {
                ctx.put("notifications", studentPortalService.getNotifications(email).subList(0, Math.min(5, studentPortalService.getNotifications(email).size())));
            } catch (Exception ignored) {}
            return ctx;
        } catch (Exception e) {
            log.debug("Context build failed for {}: {}", email, e.getMessage());
            return Map.of();
        }
    }

    /**
     * Builds the performance prediction payload with semester history.
     */
    private Map<String, Object> buildPerformancePredictionPayload(String email) {
        try {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) return Map.of("semesterHistory", List.of());

            StudentProfile student = studentProfileRepository.findByUserId(user.getId()).orElse(null);
            if (student == null) return Map.of("semesterHistory", List.of());

            // Build semester history from CGPA data
            CgpaResponse cgpa = studentPortalService.calculateCgpa(email);
            List<Map<String, Object>> semHistory = cgpa.getSemesters().stream().map(sem -> {
                Map<String, Object> s = new HashMap<>();
                s.put("semesterNumber", sem.getSemesterNumber());
                s.put("sgpa", sem.getSgpa());
                s.put("totalCredits", sem.getTotalCredits());
                return s;
            }).collect(Collectors.toList());

            // Get current attendance
            double attPct = 0;
            try {
                OverallAttendanceResponse att = studentPortalService.getOverallAttendance(email);
                attPct = att.getOverallPercentage();
            } catch (Exception ignored) {}

            return Map.of(
                    "studentId", student.getId(),
                    "semesterHistory", semHistory,
                    "currentAttendance", attPct,
                    "currentSemester", student.getSemester()
            );
        } catch (Exception e) {
            log.warn("Performance prediction payload build failed: {}", e.getMessage());
            return Map.of("semesterHistory", List.of());
        }
    }

    /**
     * Builds the attendance risk payload.
     */
    private Map<String, Object> buildAttendanceRiskPayload(String email) {
        try {
            List<SubjectAttendanceResponse> subjectAtt = studentPortalService.getAttendance(email, null);
            List<Map<String, Object>> subjectData = subjectAtt.stream().map(s -> {
                Map<String, Object> m = new HashMap<>();
                m.put("courseName", s.getCourseName());
                m.put("courseCode", s.getCourseCode());
                m.put("totalClasses", s.getTotalClasses());
                m.put("present", s.getPresent());
                m.put("percentage", s.getPercentage());
                return m;
            }).collect(Collectors.toList());
            return Map.of("subjectAttendance", subjectData);
        } catch (Exception e) {
            log.warn("Attendance risk payload build failed: {}", e.getMessage());
            return Map.of("subjectAttendance", List.of());
        }
    }

    /**
     * Builds minimal student profile for placement assistant.
     */
    private Map<String, Object> buildStudentProfileForPlacement(String email) {
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
            log.warn("Student placement profile build failed: {}", e.getMessage());
            return Map.of("cgpa", 0.0, "skills", List.of(), "hasBacklogs", false);
        }
    }
}
