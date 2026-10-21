package com.collego.controller;

import com.collego.ai.AiChatOrchestrator;
import com.collego.ai.AiHistorySanitizer;
import com.collego.ai.AiRateLimiter;
import com.collego.ai.AiScope;
import com.collego.ai.AiScopeFactory;
import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.repository.*;
import com.collego.service.AiService;
import com.collego.service.StudentPortalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Phase 9/10: AI Controller — exposes the AI features to the React frontend.
 *
 * All endpoints require authentication (JWT).
 * Role-specific endpoints add @PreAuthorize guards.
 *
 * Phase 10 hardening:
 *   - identity always comes from the verified JWT (never from the request body);
 *   - every tool execution runs under an {@link AiScope} built by {@link AiScopeFactory};
 *   - client-supplied chat history is sanitized (role whitelist) and any
 *     client-supplied "context" is ignored — the server rebuilds it;
 *   - per-user rate limiting and audit logging are applied.
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
 *   GET  /api/ai/question-paper-insights    – Feature 7: QP topic weightage for a course
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class AiController {

    private final AiService aiService;
    private final StudentPortalService studentPortalService;
    private final AiScopeFactory aiScopeFactory;
    private final AiChatOrchestrator aiChatOrchestrator;
    private final AiRateLimiter aiRateLimiter;

    // Repositories for fetching context data to pass to AI
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
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

        if (!aiRateLimiter.tryAcquire(auth.getName())) {
            return rateLimited();
        }

        String message = body.get("message") == null ? "" : String.valueOf(body.get("message"));

        // Phase 10: history is untrusted input — whitelist roles, cap length.
        @SuppressWarnings("unchecked")
        List<Map<String, String>> history = AiHistorySanitizer.sanitize((List<?>) body.get("history"));

        // Identity comes only from the verified JWT. Any body-supplied "context"
        // or user id is ignored: the server rebuilds context for the caller.
        AiScope scope = aiScopeFactory.forUser(auth.getName());
        Map<String, Object> context = buildUserContext(auth.getName());

        return ResponseEntity.ok(aiChatOrchestrator.chat(scope, message, history, context));
    }

    // ── Feature 2: Smart Search ────────────────────────────────────────────────

    @PostMapping("/smart-search")
    public ResponseEntity<Map<String, Object>> smartSearch(
            Authentication auth,
            @RequestBody Map<String, Object> body) {
        if (!aiRateLimiter.tryAcquire(auth.getName())) {
            return rateLimited();
        }
        String query = body.get("query") == null ? "" : String.valueOf(body.get("query"));
        return ResponseEntity.ok(aiService.smartSearch(query));
    }

    // ── Feature 3: Performance Prediction (Student only) ───────────────────────

    @GetMapping("/performance-prediction")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> performancePrediction(Authentication auth) {
        if (!aiRateLimiter.tryAcquire(auth.getName())) {
            return rateLimited();
        }
        String email = auth.getName();
        Map<String, Object> request = buildPerformancePredictionPayload(email);
        return ResponseEntity.ok(aiService.predictPerformance(request));
    }

    // ── Feature 4: Attendance Risk (Student only) ──────────────────────────────

    @GetMapping("/attendance-risk")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> attendanceRisk(Authentication auth) {
        if (!aiRateLimiter.tryAcquire(auth.getName())) {
            return rateLimited();
        }
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
        if (!aiRateLimiter.tryAcquire(auth.getName())) {
            return rateLimited();
        }
        String resumeText = body.get("resumeText") == null ? "" : String.valueOf(body.get("resumeText"));
        String targetRole = body.get("targetRole") == null ? null : String.valueOf(body.get("targetRole"));
        Map<String, Object> profile = buildStudentProfileForPlacement(auth.getName());
        return ResponseEntity.ok(aiService.analyzeResume(resumeText, targetRole, profile));
    }

    // ── Feature 6: Placement Assistant ────────────────────────────────────────

    @PostMapping("/placement-assistant")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'FACULTY')")
    public ResponseEntity<Map<String, Object>> placementAssistant(
            Authentication auth,
            @RequestBody Map<String, Object> body) {
        if (!aiRateLimiter.tryAcquire(auth.getName())) {
            return rateLimited();
        }
        // Merge student profile from DB into request (identity from JWT only).
        Map<String, Object> studentProfile = buildStudentProfileForPlacement(auth.getName());
        Map<String, Object> request = new HashMap<>(body);
        request.put("student", studentProfile);
        return ResponseEntity.ok(aiService.placementAssistant(request));
    }

    // ── Feature 7: Question Paper Insights ────────────────────────────────────

    @GetMapping("/question-paper-insights")
    public ResponseEntity<Map<String, Object>> questionPaperInsights(
            Authentication auth,
            @RequestParam Long courseId,
            @RequestParam(required = false) String courseCode,
            @RequestParam(required = false) String courseName) {
        if (!aiRateLimiter.tryAcquire(auth.getName())) {
            return rateLimited();
        }

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

    // ── Context builders ───────────────────────────────────────────────────────

    /**
     * Builds a context map containing the caller's live college data.
     *
     * <p>Phase 10: this context is used for the deterministic fallback path only
     * (when the local model is unavailable). It is always derived from the
     * authenticated email, never from the request body, so it cannot contain
     * another user's data.
     */
    private Map<String, Object> buildUserContext(String email) {
        try {
            Map<String, Object> ctx = new HashMap<>();
            try {
                ctx.put("attendance", studentPortalService.getOverallAttendance(email));
            } catch (Exception ignored) {}
            try {
                ctx.put("cgpa", studentPortalService.calculateCgpa(email));
            } catch (Exception ignored) {}
            try {
                List<NotificationResponse> notifications = studentPortalService.getNotifications(email);
                ctx.put("notifications", notifications.subList(0, Math.min(5, notifications.size())));
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

    private ResponseEntity<Map<String, Object>> rateLimited() {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                "error", "rate_limited",
                "message", "You have reached the AI usage limit. Please wait a few minutes and try again."
        ));
    }
}
