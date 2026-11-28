package com.collego.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignFacultySubjectRequest {
    @NotBlank(message = "Course name is required")
    private String courseName;

    @NotNull(message = "Semester ID is required")
    private Long semesterId;

    /** Credits for the subject. Defaults to 4 when omitted. */
    @Min(value = 1, message = "Credits must be at least 1")
    @Max(value = 12, message = "Credits cannot exceed 12")
    private Integer credits;

    /** Division filter (e.g., "A", "B", "C"). Empty/ null means all divisions. */
    private String divisionFilter;

    /** If true, load students from all departments (for backlog/open elective view). */
    private Boolean loadFromAllDepartments;
}
