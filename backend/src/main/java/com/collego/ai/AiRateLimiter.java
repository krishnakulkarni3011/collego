package com.collego.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Phase 10: in-memory sliding-window rate limiter for AI messages, keyed by
 * caller email.
 *
 * <p>Rationale: a local CPU/GPU model is the bottleneck, and a rate limit also
 * blunts prompt-injection probing and runaway token use. No external dependency
 * (no Bucket4j/Guava) is required for a single-instance deployment.
 */
@Component
public class AiRateLimiter {

    private final int maxPerWindow;
    private final long windowMillis;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public AiRateLimiter(
            @Value("${collego.ai.rate-limit.max:20}") int maxPerWindow,
            @Value("${collego.ai.rate-limit.window-seconds:300}") long windowSeconds) {
        this.maxPerWindow = Math.max(1, maxPerWindow);
        this.windowMillis = Math.max(1L, windowSeconds) * 1000L;
    }

    /** @return true when the call is allowed, false when the budget is exhausted. */
    public boolean tryAcquire(String key) {
        if (key == null || key.isBlank()) return true;
        long now = System.currentTimeMillis();
        Deque<Long> stamps = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (stamps) {
            while (!stamps.isEmpty() && now - stamps.peekFirst() > windowMillis) {
                stamps.pollFirst();
            }
            if (stamps.size() >= maxPerWindow) return false;
            stamps.addLast(now);
            return true;
        }
    }

    public void check(String key) {
        if (!tryAcquire(key)) {
            throw new AiRateLimitExceededException(
                    "You have reached the AI usage limit. Please wait a few minutes and try again.");
        }
    }

    public void reset(String key) {
        hits.remove(key);
    }

    public int maxPerWindow() {
        return maxPerWindow;
    }

    public long windowMillis() {
        return windowMillis;
    }
}
