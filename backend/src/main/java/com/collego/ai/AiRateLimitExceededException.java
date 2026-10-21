package com.collego.ai;

/**
 * Phase 10: thrown when a caller exceeds the per-user AI message budget.
 * Handled by {@code AiController} with a 429 response.
 */
public class AiRateLimitExceededException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public AiRateLimitExceededException(String message) {
        super(message);
    }
}
