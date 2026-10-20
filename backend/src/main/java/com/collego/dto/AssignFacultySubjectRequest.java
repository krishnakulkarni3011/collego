package com.collego.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignFacultySubjectRequest {
    @NotNull(message = "Course ID is required")
    private Long courseId;

    @NotNull(message = "Semester ID is required")
    private Long semesterId;
}