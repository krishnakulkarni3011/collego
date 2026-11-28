package com.collego.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/** Open elective subject created from particular students of one or more departments. */
@Data
public class CreateOpenElectiveRequest {
    @NotBlank(message = "Course name is required")
    private String courseName;

    /** Optional manually entered subject code; generated when omitted. */
    @Size(max = 30, message = "Subject code must be 30 characters or fewer")
    private String courseCode;

    @NotNull(message = "Semester ID is required")
    private Long semesterId;

    @Min(value = 1, message = "Credits must be at least 1")
    @Max(value = 12, message = "Credits cannot exceed 12")
    private Integer credits;

    @NotEmpty(message = "Select at least one department")
    private List<Long> departmentIds;

    @NotEmpty(message = "Select at least one student")
    private List<Long> studentIds;
}
