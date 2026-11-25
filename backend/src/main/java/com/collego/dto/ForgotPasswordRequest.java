package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    /**
     * Registered email address or, for students, their USN. The reset link is
     * always sent to the email address stored on the matched account.
     */
    @NotBlank(message = "Email or USN is required")
    private String email;
}
