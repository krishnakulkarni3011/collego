package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentReportResponse {
    private Long departmentId;
    private String departmentName;
    private String departmentCode;
    private long totalStudents;
    private long totalFaculty;
    private long totalCourses;
    private long totalSections;
    private double averageAttendance;
    private double averagePassPercentage;
    private Double averageCgpa;
}
