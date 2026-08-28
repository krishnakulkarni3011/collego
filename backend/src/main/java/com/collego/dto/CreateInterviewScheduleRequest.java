package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInterviewScheduleRequest {

    @NotNull(message = "Application ID is required")
    private Long applicationId;

    @NotNull(message = "Round number is required")
    private Integer roundNumber;

    private String roundName;

    @NotNull(message = "Scheduled date/time is required")
    private LocalDateTime scheduledAt;

    private Integer durationMinutes;

    @NotBlank(message = "Mode is required (ONLINE, OFFLINE, HYBRID)")
    private String mode;

    private String venue;
    private String meetLink;
}
