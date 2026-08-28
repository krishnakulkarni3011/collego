package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateTimetableSlotRequest {
    @NotNull(message = "Section ID is required")
    private Long sectionId;

    @NotBlank(message = "Day of week is required")
    private String dayOfWeek;

    @NotBlank(message = "Start time is required (HH:mm)")
    private String startTime;

    @NotBlank(message = "End time is required (HH:mm)")
    private String endTime;

    private String roomNumber;
}
