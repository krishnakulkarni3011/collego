package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class PlacedStudentRequest {
    @NotEmpty(message = "Select at least one student")
    private List<Long> studentIds;

    @NotBlank(message = "Company is required")
    private String companyName;

    private String salary;
    private String role;
    private Long departmentId;
}
