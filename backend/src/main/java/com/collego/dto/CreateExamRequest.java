package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateExamRequest {
    @NotBlank(message = "Exam name is required")
    private String name;

    @NotBlank(message = "Exam type is required")
    private String examType;

    @NotNull(message = "Semester is required")
    private Long semesterId;

    private LocalDate startDate;
    private LocalDate endDate;
}
