package com.collego.ai;

import com.collego.repository.FacultyProfileRepository;
import com.collego.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Phase 10 (L4): last line of defence before an AI reply reaches the user.
 *
 * <p>The AI path is already scoped at the data layer, so this guard exists to
 * catch the two failure modes a scoped design can still produce:
 * <ol>
 *   <li>a secret leaking into prose (bcrypt hashes, tokens, credential-shaped
 *       keys) — relevant for the admin role, which otherwise sees full data;</li>
 *   <li>a student's reply mentioning another person's email address, which is
 *       the observable shape of a cross-user leak or a hallucinated record.</li>
 * </ol>
 *
 * <p>On violation the reply is replaced with a neutral refusal and the incident
 * is audit-logged. The guard never leaks <em>whether</em> the requested record
 * exists.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class AiOutputGuard {

    public static final String SAFE_FALLBACK =
            "I can only use your own academic data, so I can't share that. "
                    + "Ask me about your attendance, marks, CGPA, timetable, assignments or placements.";

    private static final Pattern BCRYPT = Pattern.compile("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{20,}");
    private static final Pattern TOKEN_LIKE = Pattern.compile("eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{4,}");
    private static final Pattern EMAIL = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");

    /** Credential-shaped keys that must never appear in an AI reply. */
    private static final List<String> FORBIDDEN_TOKENS = List.of(
            "passwordhash", "password_hash", "\"password\"", "hashedpassword",
            "refreshtoken", "refresh_token", "passwordresettoken", "password_reset_token",
            "clientsecret", "client_secret", "aws_secret_access_key", "private_key");

    private static final long EMAIL_CACHE_MILLIS = 5 * 60 * 1000L;

    private final FacultyProfileRepository facultyProfileRepository;
    private final AuditService auditService;

    private volatile Set<String> cachedShareableEmails = Set.of();
    private volatile long cacheExpiresAt = 0L;

    /** Returns a safe reply: either the original text or a neutral refusal. */
    public String enforce(AiScope scope, String text) {
        if (text == null || text.isBlank()) return SAFE_FALLBACK;
        String violation = detect(scope, text, shareableEmails());
        if (violation != null) {
            log.warn("AI output blocked for {}: {}", scope != null ? scope.email() : "unknown", violation);
            try {
                auditService.log(scope != null ? scope.userId() : null,
                        scope != null ? scope.email() : null,
                        "AI_OUTPUT_BLOCKED", "AI", null, violation, null);
            } catch (Exception ignored) {
                // never break the response because auditing failed
            }
            return SAFE_FALLBACK;
        }
        return text;
    }

    /**
     * Pure detection logic — package-private and static so it can be unit tested
     * without a Spring context or a database.
     *
     * @return a reason string when the text must be blocked, otherwise null
     */
    static String detect(AiScope scope, String text, Set<String> shareableEmails) {
        if (text == null || text.isEmpty()) return null;

        if (BCRYPT.matcher(text).find()) {
            return "bcrypt hash detected in AI output";
        }
        if (TOKEN_LIKE.matcher(text).find()) {
            return "token-like string detected in AI output";
        }

        String lower = text.toLowerCase(Locale.ROOT);
        for (String token : FORBIDDEN_TOKENS) {
            if (lower.contains(token)) {
                return "credential-shaped key '" + token + "' in AI output";
            }
        }

        // A student may legitimately see faculty addresses (public directory) and
        // their own address — anything else is a cross-user leak.
        if (scope != null && scope.isStudent()) {
            Set<String> allowed = new HashSet<>();
            if (scope.email() != null) allowed.add(scope.email().toLowerCase(Locale.ROOT));
            if (shareableEmails != null) {
                for (String email : shareableEmails) {
                    if (email != null) allowed.add(email.toLowerCase(Locale.ROOT));
                }
            }
            Matcher matcher = EMAIL.matcher(text);
            while (matcher.find()) {
                if (!allowed.contains(matcher.group().toLowerCase(Locale.ROOT))) {
                    return "cross-user email address in AI output";
                }
            }
        }
        return null;
    }

    /** Replaces the cached faculty-email allowlist (used by tests). */
    public void setShareableEmailsForTesting(Set<String> emails) {
        this.cachedShareableEmails = emails == null ? Set.of() : Set.copyOf(emails);
        this.cacheExpiresAt = System.currentTimeMillis() + EMAIL_CACHE_MILLIS;
    }

    private Set<String> shareableEmails() {
        long now = System.currentTimeMillis();
        if (now < cacheExpiresAt) return cachedShareableEmails;
        try {
            List<String> emails = facultyProfileRepository.findAllFacultyEmails();
            cachedShareableEmails = emails == null ? Set.of() : new HashSet<>(new ArrayList<>(emails));
        } catch (Exception e) {
            log.debug("Could not load faculty email allowlist: {}", e.getMessage());
            cachedShareableEmails = Set.of();
        }
        cacheExpiresAt = now + EMAIL_CACHE_MILLIS;
        return cachedShareableEmails;
    }
}
