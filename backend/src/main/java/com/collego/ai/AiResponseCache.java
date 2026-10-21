package com.collego.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Phase 10: short-lived, per-user response cache.
 *
 * <p>A local model on a 6 GB GPU is the bottleneck, so identical questions from
 * the same user are answered from cache for a few seconds. The key includes the
 * user id, so one user can never be served another user's answer.
 */
@Component
public class AiResponseCache {

    public record Entry(String reply, String intent, long expiresAt) {
    }

    private final long ttlMillis;
    private final int maxEntries;
    private final Map<String, Entry> cache = new ConcurrentHashMap<>();

    public AiResponseCache(
            @Value("${collego.ai.cache.ttl-seconds:90}") long ttlSeconds,
            @Value("${collego.ai.cache.max-entries:500}") int maxEntries) {
        this.ttlMillis = Math.max(1L, ttlSeconds) * 1000L;
        this.maxEntries = Math.max(1, maxEntries);
    }

    public Optional<Entry> get(Long userId, String message) {
        String key = key(userId, message);
        if (key == null) return Optional.empty();
        Entry entry = cache.get(key);
        if (entry == null) return Optional.empty();
        if (entry.expiresAt() < System.currentTimeMillis()) {
            cache.remove(key);
            return Optional.empty();
        }
        return Optional.of(entry);
    }

    public void put(Long userId, String message, String reply, String intent) {
        if (reply == null || reply.isBlank()) return;
        String key = key(userId, message);
        if (key == null) return;
        if (cache.size() >= maxEntries) cache.clear();
        cache.put(key, new Entry(reply, intent, System.currentTimeMillis() + ttlMillis));
    }

    public void clear() {
        cache.clear();
    }

    public int size() {
        return cache.size();
    }

    private static String key(Long userId, String message) {
        if (userId == null || message == null || message.isBlank()) return null;
        String normalized = message.trim().toLowerCase().replaceAll("\\s+", " ");
        return userId + "|" + Integer.toHexString(normalized.hashCode()) + "|" + normalized.length();
    }
}
