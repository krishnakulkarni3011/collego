package com.collego.ai;

import com.collego.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Phase 10: drives the grounded, tool-calling chat loop.
 *
 * <p>Flow per user message:
 * <ol>
 *   <li>the model is offered only the tools valid for the caller's role;</li>
 *   <li>if it asks for data, Spring Boot executes the tool <em>under the
 *       caller's {@link AiScope}</em> and sends the result back as data;</li>
 *   <li>repeat up to {@code collego.ai.max-tool-rounds}, then force a text answer;</li>
 *   <li>the reply passes through {@link AiOutputGuard} before it is returned.</li>
 * </ol>
 *
 * <p>The model never touches the database and never supplies an identity. When
 * the model is unreachable, the deterministic ai-service stubs (Phase 9
 * behaviour) answer instead, so the feature never hard-fails.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class AiChatOrchestrator {

    private final AiService aiService;
    private final AiToolRegistry toolRegistry;
    private final AiOutputGuard outputGuard;
    private final AiAuditLogger audit;
    private final AiResponseCache cache;

    @Value("${collego.ai.max-tool-rounds:4}")
    private int maxToolRounds;

    public Map<String, Object> chat(AiScope scope, String message,
                                    List<Map<String, String>> history,
                                    Map<String, Object> context) {
        String safeMessage = message == null ? "" : message.trim();
        if (safeMessage.isEmpty()) {
            return reply("Please ask a question about your attendance, marks, timetable or placements.", null);
        }

        Optional<AiResponseCache.Entry> cached = cache.get(scope.userId(), safeMessage);
        if (cached.isPresent()) {
            return reply(cached.get().reply(), cached.get().intent());
        }

        List<Map<String, Object>> toolDescriptors = toolRegistry.descriptors(scope.role());

        List<Map<String, Object>> transcript = new ArrayList<>();
        for (Map<String, String> turn : history) {
            transcript.add(new LinkedHashMap<>(turn));
        }

        List<Map<String, Object>> toolTrace = new ArrayList<>();
        Map<String, Object> scopeInfo = new LinkedHashMap<>();
        scopeInfo.put("role", scope.role() == null ? "UNKNOWN" : scope.role().name());
        scopeInfo.put("scope", scope.describe());

        for (int round = 0; round <= Math.max(0, maxToolRounds); round++) {
            boolean finalRound = round >= maxToolRounds;
            Map<String, Object> response = aiService.chatWithTools(
                    safeMessage,
                    transcript,
                    context,
                    finalRound ? List.of() : toolDescriptors,
                    toolTrace,
                    finalRound,
                    scopeInfo);

            if (response == null || response.containsKey("error")) {
                break;
            }

            List<Map<String, Object>> calls = readToolCalls(response);
            if (!calls.isEmpty() && !finalRound) {
                for (Map<String, Object> call : calls) {
                    toolTrace.add(executeTool(scope, call));
                }
                continue;
            }

            Object replyText = response.get("reply");
            if (replyText != null && !String.valueOf(replyText).isBlank()) {
                String safe = outputGuard.enforce(scope, String.valueOf(replyText));
                Object intent = response.get("intent");
                String intentText = intent == null ? null : String.valueOf(intent);
                audit.chat(scope, true);
                cache.put(scope.userId(), safeMessage, safe, intentText);
                return reply(safe, intentText);
            }
            break;
        }

        // Deterministic fallback: model unreachable, timed out, or gave nothing usable.
        Map<String, Object> fallback = aiService.chat(safeMessage, history, context);
        audit.chat(scope, false);
        Object fallbackReply = fallback.get("reply");
        if (fallbackReply != null && !String.valueOf(fallbackReply).isBlank()) {
            return reply(outputGuard.enforce(scope, String.valueOf(fallbackReply)), fallback.get("intent"));
        }
        return reply("The AI assistant is temporarily unavailable. Please try again in a moment.", null);
    }

    private Map<String, Object> executeTool(AiScope scope, Map<String, Object> call) {
        String name = call.get("name") == null ? "" : String.valueOf(call.get("name"));
        Map<String, Object> arguments = asMap(call.get("arguments"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("name", name);
        try {
            AiTool tool = toolRegistry.require(name, scope.role());
            Object data = tool.execute(scope, arguments);
            audit.toolCall(scope, name, arguments, true, null);
            result.put("content", data == null ? Map.of() : data);
        } catch (AiAccessDeniedException e) {
            audit.toolCall(scope, name, arguments, false, e.getMessage());
            Map<String, Object> denied = new LinkedHashMap<>();
            denied.put("error", "access_denied");
            denied.put("message", "You can only access your own data.");
            result.put("content", denied);
        } catch (Exception e) {
            log.warn("AI tool {} failed for {}: {}", name, scope.email(), e.getMessage());
            audit.toolCall(scope, name, arguments, false, "tool_failed:" + e.getClass().getSimpleName());
            Map<String, Object> failed = new LinkedHashMap<>();
            failed.put("error", "tool_failed");
            failed.put("message", "That information is unavailable right now.");
            result.put("content", failed);
        }
        return result;
    }

    private List<Map<String, Object>> readToolCalls(Map<String, Object> response) {
        List<Map<String, Object>> calls = new ArrayList<>();
        Object raw = response.get("toolCalls");
        if (raw instanceof List<?> list) {
            for (Object item : list) {
                Map<String, Object> call = asMap(item);
                if (!call.isEmpty()) calls.add(call);
            }
        }
        return calls;
    }

    private static Map<String, Object> asMap(Object value) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (value instanceof Map<?, ?> map) {
            map.forEach((key, val) -> out.put(String.valueOf(key), val));
        }
        return out;
    }

    private static Map<String, Object> reply(String text, Object intent) {
        Map<String, Object> out = new HashMap<>();
        out.put("reply", text);
        out.put("intent", intent);
        return out;
    }
}
