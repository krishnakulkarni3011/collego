package com.collego.dto;

import lombok.*;

/** Lightweight student row for faculty cross-department selection (open elective / backlog). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacultyAllStudentResponse {
    private Long studentId;
    private String name;
    private String enrollmentNumber;
    private String departmentName;
    private String section;
    private Integer year;
    private Integer semester;
}
