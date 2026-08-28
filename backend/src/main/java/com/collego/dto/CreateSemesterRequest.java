package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateSemesterRequest {
    @NotBlank(message = "Semester name is required")
    private String name;

    @NotNull(message = "Semester number is required")
    private Integer number;

    @NotBlank(message = "Academic year is required")
    private String academicYear;

    private LocalDate startDate;
    private LocalDate endDate;
}
