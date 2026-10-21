package com.collego.ai;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Phase 10 security fix (hole H1): client-supplied chat history is untrusted.
 *
 * <p>Before this change {@code ai-service/main.py} forwarded {@code history}
 * with its {@code role} verbatim, so a client could POST a history entry with
 * {@code role: "system"} and override the system prompt. Only {@code user} and
 * {@code assistant} turns survive here, content is coerced to a bounded string,
 * and only the last {@value #MAX_TURNS} turns are kept.
 */
public final class AiHistorySanitizer {

    /** Maximum number of conversation turns forwarded to the model. */
    public static final int MAX_TURNS = 6;

    /** Maximum characters kept per turn. */
    public static final int MAX_CHARS = 2000;

    private AiHistorySanitizer() {
    }

    public static boolean isAllowedRole(Object role) {
        if (role == null) return false;
        String value = String.valueOf(role).trim().toLowerCase();
        return "user".equals(value) || "assistant".equals(value);
    }

    /**
     * Drops everything that is not a bounded user/assistant turn.
     * Never returns a {@code system}, {@code tool} or {@code function} role.
     */
    public static List<Map<String, String>> sanitize(List<?> raw) {
        List<Map<String, String>> cleaned = new ArrayList<>();
        if (raw == null || raw.isEmpty()) return cleaned;

        for (Object item : raw) {
            Object role;
            Object content;
            if (item instanceof Map<?, ?> map) {
                role = map.get("role");
                content = map.get("content");
            } else {
                continue;
            }
            if (!isAllowedRole(role) || content == null) continue;

            String text = String.valueOf(content).trim();
            if (text.isEmpty()) continue;
            if (text.length() > MAX_CHARS) text = text.substring(0, MAX_CHARS);

            Map<String, String> turn = new LinkedHashMap<>();
            turn.put("role", String.valueOf(role).trim().toLowerCase());
            turn.put("content", text);
            cleaned.add(turn);
        }

        if (cleaned.size() > MAX_TURNS) {
            return new ArrayList<>(cleaned.subList(cleaned.size() - MAX_TURNS, cleaned.size()));
        }
        return cleaned;
    }
}
