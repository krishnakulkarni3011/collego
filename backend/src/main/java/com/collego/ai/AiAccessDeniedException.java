package com.collego.ai;

/**
 * Phase 10: thrown when an AI tool attempts to read data outside the caller's
 * {@link AiScope}. Handled by {@code AiChatOrchestrator}, which returns a
 * neutral "you can only access your own data" message and audit-logs the denial
 * instead of leaking whether the requested record exists.
 */
public class AiAccessDeniedException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public AiAccessDeniedException(String message) {
        super(message);
    }
}
