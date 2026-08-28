package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateJobPostingRequest {

    @NotNull(message = "Company ID is required")
    private Long companyId;

    @NotBlank(message = "Job title is required")
    private String title;

    private String description;
    private String responsibilities;
    private String requirements;
    private String packageOffered;
    private String jobType;    // FULL_TIME, INTERNSHIP, CONTRACT
    private String workMode;   // REMOTE, ONSITE, HYBRID
    private String location;
    private Integer openPositions;

    // Eligibility
    private Double minCgpa;
    private Integer maxBacklogs;
    /** Comma-separated dept codes, e.g. "CS,IT,ECE" — null means all depts */
    private String allowedDepartmentCodes;
    private Integer minAdmissionYear;
    private Integer maxAdmissionYear;

    private LocalDate applicationDeadline;
    private LocalDate driveDate;
}
