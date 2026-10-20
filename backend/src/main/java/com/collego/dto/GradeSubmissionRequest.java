package com.collego.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class GradeSubmissionRequest {
    @NotNull(message = "Marks are required")
    @DecimalMin(value = "0.0", message = "Marks cannot be negative")
    private BigDecimal marks;

    private String feedback;
}
