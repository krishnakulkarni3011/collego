package com.collego.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplyJobRequest {

    @NotNull(message = "Job posting ID is required")
    private Long jobPostingId;

    /** Resume ID to attach — if null, uses the student's active resume */
    private Long resumeId;

    private String coverNote;
}
