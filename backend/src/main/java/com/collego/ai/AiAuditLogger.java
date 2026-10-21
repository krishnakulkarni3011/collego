package com.collego.ai;

import com.collego.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Phase 10: structured audit trail for every AI data access.
 *
 * <p>Writes to the existing {@code audit_logs} table through {@link AuditService}
 * so AI activity is reviewable next to every other privileged action. Arguments
 * are redacted and truncated before they are persisted.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiAuditLogger {

    private static final int MAX_DETAILS = 1900;
    private static final Set<String> SECRET_KEYS = Set.of(
            "password", "passwordhash", "token", "refreshtoken", "secret", "authorization");

    private final AuditService auditService;

    public void toolCall(AiScope scope, String toolName, Map<String, Object> arguments,
                         boolean allowed, String reason) {
        if (scope == null) return;
        String action = allowed ? "AI_TOOL_CALL" : "AI_TOOL_DENIED";
        String details = "tool=" + toolName
                + " allowed=" + allowed
                + " role=" + (scope.role() != null ? scope.role().name() : "UNKNOWN")
                + " args=" + redact(arguments)
                + (reason != null ? " reason=" + reason : "");
        persist(scope, action, details);
    }

    public void chat(AiScope scope, boolean llmUsed) {
        if (scope == null) return;
        persist(scope, "AI_CHAT", "llm=" + llmUsed);
    }

    private void persist(AiScope scope, String action, String details) {
        String bounded = details.length() > MAX_DETAILS ? details.substring(0, MAX_DETAILS) : details;
        try {
            auditService.log(scope.userId(), scope.email(), action, "AI", null, bounded, null);
        } catch (Exception e) {
            // Auditing must never break the user-facing flow.
            log.warn("AI audit write failed for {}: {}", scope.email(), e.getMessage());
        }
    }

    private String redact(Map<String, Object> arguments) {
        if (arguments == null || arguments.isEmpty()) return "{}";
        Map<String, Object> safe = new LinkedHashMap<>();
        arguments.forEach((key, value) -> {
            String lower = key == null ? "" : key.toLowerCase();
            boolean secret = SECRET_KEYS.stream().anyMatch(lower::contains);
            safe.put(key, secret ? "[redacted]" : String.valueOf(value));
        });
        return safe.toString();
    }
}
