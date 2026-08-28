package com.collego.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BacklogReportResponse {
    private long totalStudentsWithBacklogs;
    private long totalBacklogInstances;
    private List<StudentBacklogEntry> students;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentBacklogEntry {
        private Long studentId;
        private String enrollmentNumber;
        private String studentName;
        private String departmentName;
        private int backlogCount;
        private List<BacklogCourse> backlogCourses;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BacklogCourse {
        private String courseName;
        private String courseCode;
        private String grade;
        private Double obtainedMarks;
        private Double maxMarks;
    }
}
