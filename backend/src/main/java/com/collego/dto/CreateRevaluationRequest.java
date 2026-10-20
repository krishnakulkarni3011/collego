package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateRevaluationRequest {
    @NotNull(message = "Course is required")
    private Long courseId;

    @NotNull(message = "Semester is required")
    private Long semesterId;

    @NotBlank(message = "Please describe why you are requesting revaluation")
    @Size(max = 1000, message = "Reason is too long")
    private String reason;
}
