package com.collego.ai;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 10: the cache must never serve one user's answer to another user.
 */
class AiResponseCacheTest {

    @Test
    void cacheIsPerUser() {
        AiResponseCache cache = new AiResponseCache(60, 100);

        cache.put(1L, "what is my attendance", "82%", "attendance");

        assertTrue(cache.get(1L, "what is my attendance").isPresent());
        assertFalse(cache.get(2L, "what is my attendance").isPresent(),
                "another user must never receive a cached answer");
    }

    @Test
    void questionsAreNormalisedForLookup() {
        AiResponseCache cache = new AiResponseCache(60, 100);

        cache.put(1L, "  What   is my CGPA?  ", "8.4", null);

        assertTrue(cache.get(1L, "what is my cgpa?").isPresent());
        assertFalse(cache.get(1L, "what is my attendance").isPresent());
    }

    @Test
    void distinctIdsDoNotCollide() {
        AiResponseCache cache = new AiResponseCache(60, 100);

        cache.put(1L, "same text", "answer-one", null);
        cache.put(2L, "same text", "answer-two", null);

        assertEquals("answer-one", cache.get(1L, "same text").orElseThrow().reply());
        assertEquals("answer-two", cache.get(2L, "same text").orElseThrow().reply());
    }

    @Test
    void expiredEntriesAreDropped() throws InterruptedException {
        AiResponseCache cache = new AiResponseCache(1, 100);
        cache.put(1L, "hi", "hello", null);
        assertTrue(cache.get(1L, "hi").isPresent());
        Thread.sleep(1100);
        assertTrue(cache.get(1L, "hi").isEmpty());
    }

    @Test
    void blankAnswersAndMissingKeysAreIgnored() {
        AiResponseCache cache = new AiResponseCache(60, 100);
        cache.put(1L, "hi", "   ", null);
        cache.put(null, "hi", "answer", null);
        assertEquals(0, cache.size());
        assertTrue(cache.get(null, "hi").isEmpty());
    }
}
