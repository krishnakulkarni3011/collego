package com.collego.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FacultySubjectAssignmentResponse {
    private Long id;
    private Long facultyId;
    private String facultyName;
    private Long courseId;
    private String courseName;
    private String courseCode;
    private Long semesterId;
    private String semesterName;
    private Integer semesterNumber;
    private Boolean isActive;
    private String createdAt;
}