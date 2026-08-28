package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectReportResponse {
    private Long sectionId;
    private String courseName;
    private String courseCode;
    private String sectionName;
    private String facultyName;
    private String departmentName;
    private long totalEnrolled;
    private long totalPassed;
    private long totalFailed;
    private double passPercentage;
    private Double averageMarks;
    private Double maxMarks;
    private double averageAttendance;
}
