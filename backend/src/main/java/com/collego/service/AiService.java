package com.collego.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Phase 9: AiService — Spring Boot client calling the FastAPI ai-service.
 *
 * All methods:
 *   - Build the request payload
 *   - POST to the ai-service endpoint
 *   - Return the parsed response as Map<String, Object>
 *
 * On failure (ai-service down, timeout), methods return a graceful fallback map
 * so the rest of the API stays healthy.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class AiService {

    private final RestTemplate restTemplate;

    @Value("${collego.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    // ── Health ────────────────────────────────────────────────────────────────

    public Map<String, Object> health() {
        return get("/health");
    }

    // ── Feature 1: Chat ───────────────────────────────────────────────────────

    public Map<String, Object> chat(String message, List<Map<String, String>> history,
                                    Map<String, Object> context) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("message", message);
        payload.put("history", history != null ? history : List.of());
        if (context != null) payload.put("context", context);
        return post("/chat", payload);
    }

    // ── Feature 2: Smart Search ───────────────────────────────────────────────

    public Map<String, Object> smartSearch(String query) {
        return post("/smart-search", Map.of("query", query));
    }

    // ── Feature 3: Performance Prediction ────────────────────────────────────

    public Map<String, Object> predictPerformance(Map<String, Object> request) {
        return post("/performance-prediction", request);
    }

    // ── Feature 4: Attendance Risk ────────────────────────────────────────────

    public Map<String, Object> attendanceRisk(Map<String, Object> request) {
        return post("/attendance-risk", request);
    }

    // ── Feature 5: Resume Analyze ─────────────────────────────────────────────

    public Map<String, Object> analyzeResume(String resumeText, String targetRole,
                                              Map<String, Object> studentProfile) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("resumeText", resumeText);
        if (targetRole != null) payload.put("targetRole", targetRole);
        if (studentProfile != null) payload.put("studentProfile", studentProfile);
        return post("/resume-analyze", payload);
    }

    // ── Feature 6: Placement Assistant ───────────────────────────────────────

    public Map<String, Object> placementAssistant(Map<String, Object> request) {
        return post("/placement-assistant", request);
    }

    // ── Feature 7: Question Paper Insights ───────────────────────────────────

    public Map<String, Object> questionPaperInsights(Map<String, Object> request) {
        return post("/question-paper-insights", request);
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private Map<String, Object> post(String path, Object body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Object> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    aiServiceUrl + path,
                    HttpMethod.POST,
                    entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return response.getBody() != null ? response.getBody() : Map.of("error", "Empty response");
        } catch (RestClientException e) {
            log.warn("AI service call to {} failed: {}", path, e.getMessage());
            return Map.of("error", "AI service unavailable", "path", path,
                         "message", "AI features are temporarily offline. Please try again later.");
        }
    }

    private Map<String, Object> get(String path) {
        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    aiServiceUrl + path,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return response.getBody() != null ? response.getBody() : Map.of("error", "Empty response");
        } catch (RestClientException e) {
            log.warn("AI service GET {} failed: {}", path, e.getMessage());
            return Map.of("error", "AI service unavailable", "status", "DOWN");
        }
    }
}
