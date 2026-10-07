package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateNoticeRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Message content is required")
    private String message;

    private String type; // ACADEMIC, GENERAL, etc. — defaults to GENERAL

    private Long departmentId; // null = all departments

    /**
     * Phase 8/9: When true, the backend calls the AI service to enhance
     * the title + message into a professionally formatted notice before saving.
     */
    private Boolean enhance;
}
