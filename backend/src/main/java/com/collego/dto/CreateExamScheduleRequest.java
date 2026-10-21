package com.collego.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class CreateExamScheduleRequest {
    @NotNull(message = "Exam is required")
    private Long examId;

    @NotNull(message = "Course is required")
    private Long courseId;

    @NotNull(message = "Section is required")
    private Long sectionId;

    @NotNull(message = "Exam date is required")
    private LocalDate examDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    private String room;

    private Long invigilatorId;
}
