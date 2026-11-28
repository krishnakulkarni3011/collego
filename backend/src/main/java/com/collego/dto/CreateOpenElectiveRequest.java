package com.collego.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/** Open elective subject created from particular students of one department. */
@Data
public class CreateOpenElectiveRequest {
    @NotBlank(message = "Course name is required")
    private String courseName;

    @NotNull(message = "Semester ID is required")
    private Long semesterId;

    @Min(value = 1, message = "Credits must be at least 1")
    @Max(value = 12, message = "Credits cannot exceed 12")
    private Integer credits;

    /** Department whose students are being added. */
    @NotNull(message = "Department is required")
    private Long departmentId;

    @NotEmpty(message = "Select at least one student")
    private List<Long> studentIds;
}
