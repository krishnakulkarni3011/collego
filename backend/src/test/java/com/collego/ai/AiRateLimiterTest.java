package com.collego.ai;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 10: per-caller sliding-window rate limiting.
 */
class AiRateLimiterTest {

    @Test
    void allowsUpToTheLimitThenBlocks() {
        AiRateLimiter limiter = new AiRateLimiter(3, 60);
        String key = "student@collego.edu";

        assertTrue(limiter.tryAcquire(key));
        assertTrue(limiter.tryAcquire(key));
        assertTrue(limiter.tryAcquire(key));
        assertFalse(limiter.tryAcquire(key), "fourth call must be rejected");

        assertThrows(AiRateLimitExceededException.class, () -> limiter.check(key));
    }

    @Test
    void limitsArePerCaller() {
        AiRateLimiter limiter = new AiRateLimiter(1, 60);
        assertTrue(limiter.tryAcquire("a@collego.edu"));
        assertFalse(limiter.tryAcquire("a@collego.edu"));
        assertTrue(limiter.tryAcquire("b@collego.edu"), "one caller must not exhaust another's budget");
    }

    @Test
    void resetClearsTheWindow() {
        AiRateLimiter limiter = new AiRateLimiter(1, 60);
        String key = "c@collego.edu";
        assertTrue(limiter.tryAcquire(key));
        assertFalse(limiter.tryAcquire(key));
        limiter.reset(key);
        assertTrue(limiter.tryAcquire(key));
    }

    @Test
    void blankKeysAreNotLimited() {
        AiRateLimiter limiter = new AiRateLimiter(1, 60);
        assertTrue(limiter.tryAcquire(null));
        assertTrue(limiter.tryAcquire(""));
    }

    @Test
    void windowExpiryReleasesTheBudget() throws InterruptedException {
        AiRateLimiter limiter = new AiRateLimiter(1, 1);
        String key = "d@collego.edu";
        assertTrue(limiter.tryAcquire(key));
        assertFalse(limiter.tryAcquire(key));
        Thread.sleep(1100);
        assertTrue(limiter.tryAcquire(key), "budget must refill after the window");
    }
}
