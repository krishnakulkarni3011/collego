package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemOverviewResponse {
    private long totalStudents;
    private long totalFaculty;
    private long totalDepartments;
    private long totalCourses;
    private long totalSections;
    private long totalEnrollments;
    private long pendingQuestionPapers;
    private double overallAverageAttendance;
    private double overallPassPercentage;
}
