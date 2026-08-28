package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceSummaryResponse {
    private Long departmentId;
    private String departmentName;
    private long totalStudents;
    private double averageAttendancePercentage;
    private long studentsAbove75;
    private long studentsBelow75;
    private long studentsBelow50;
}
