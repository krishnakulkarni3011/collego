package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectAttendanceResponse {
    private Long sectionId;
    private String courseName;
    private String courseCode;
    private long totalClasses;
    private long present;
    private long absent;
    private double percentage;
}
