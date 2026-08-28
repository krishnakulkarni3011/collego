package com.collego.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacultyAnalyticsResponse {
    private Long sectionId;
    private String courseName;
    private String courseCode;
    private long totalStudents;

    // Attendance analytics
    private double averageAttendancePercentage;
    private long studentsAbove75Attendance;
    private long studentsBelow75Attendance;

    // Internal marks analytics
    private Double ia1Average;
    private Double ia2Average;
    private Double ia1MaxMarks;
    private Double ia2MaxMarks;

    // Semester marks analytics
    private Double semesterAverage;
    private Double semesterMaxMarks;
    private Double passPercentage;
    private long totalPassed;
    private long totalFailed;

    // Grade distribution
    private List<GradeCount> gradeDistribution;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GradeCount {
        private String grade;
        private long count;
    }
}
