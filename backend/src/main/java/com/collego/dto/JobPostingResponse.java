package com.collego.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobPostingResponse {
    private Long id;
    private Long companyId;
    private String companyName;
    private String companyIndustry;
    private String title;
    private String description;
    private String responsibilities;
    private String requirements;
    private String packageOffered;
    private String jobType;
    private String workMode;
    private String location;
    private Integer openPositions;

    // Eligibility
    private Double minCgpa;
    private Integer maxBacklogs;
    private String allowedDepartmentCodes;
    private Integer minAdmissionYear;
    private Integer maxAdmissionYear;

    private LocalDate applicationDeadline;
    private LocalDate driveDate;
    private String status;

    // Computed fields
    private Long totalApplications;
    private Long shortlistedCount;
    private Long selectedCount;

    /** Whether the requesting student is eligible (null for non-student callers) */
    private Boolean isEligible;

    /** Whether the requesting student has already applied */
    private Boolean hasApplied;

    private LocalDateTime createdAt;
}
