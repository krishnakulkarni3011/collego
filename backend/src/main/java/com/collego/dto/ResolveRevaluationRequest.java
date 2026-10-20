package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResolveRevaluationRequest {
    @NotBlank(message = "Status is required")
    private String status;

    private String response;
}
