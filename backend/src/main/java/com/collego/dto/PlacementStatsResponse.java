package com.collego.dto;

import lombok.*;
import java.util.List;

/**
 * Phase 7 — Placement statistics for Admin and Student dashboards.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlacementStatsResponse {

    // Overall
    private Long totalCompanies;
    private Long openJobPostings;
    private Long totalApplications;
    private Long studentsPlaced;        // distinct students with SELECTED status
    private Long totalOffersExtended;   // total SELECTED applications

    // By status
    private Long shortlistedCount;
    private Long pendingCount;          // APPLIED but not yet shortlisted

    // Placement rate
    private Double placementRate;       // studentsPlaced / totalEligibleStudents * 100

    // Department-wise breakdown
    private List<DepartmentPlacementEntry> departmentBreakdown;

    // Company-wise placements (top companies by offers)
    private List<CompanyPlacementEntry> topCompanies;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentPlacementEntry {
        private String departmentName;
        private String departmentCode;
        private Long totalStudents;
        private Long studentsApplied;
        private Long studentsPlaced;
        private Double placementRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanyPlacementEntry {
        private Long companyId;
        private String companyName;
        private Long offersExtended;
        private String highestPackage;
    }
}
