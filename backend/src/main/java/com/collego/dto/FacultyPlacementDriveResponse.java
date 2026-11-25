package com.collego.dto;

import lombok.*;

import java.time.LocalDate;

/**
 * Read-only placement drive summary shown to faculty. Only the fields the
 * faculty portal needs are exposed here; attachments and descriptions stay
 * in the admin placement workflow.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacultyPlacementDriveResponse {
    private String title;
    private String companyName;
    private String packageOffered;
    private LocalDate driveDate;
    private String departmentName;
    private String eligibilityCriteria;
}
