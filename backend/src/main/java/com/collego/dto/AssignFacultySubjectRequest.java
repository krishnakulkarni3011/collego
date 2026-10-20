package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignFacultySubjectRequest {
    @NotBlank(message = "Course name is required")
    private String courseName;

    @NotNull(message = "Semester ID is required")
    private Long semesterId;
}
