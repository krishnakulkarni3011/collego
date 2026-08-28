package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacultySectionResponse {
    private Long sectionId;
    private String sectionName;
    private Long courseId;
    private String courseName;
    private String courseCode;
    private Integer credits;
    private Long semesterId;
    private String semesterName;
    private Integer semesterNumber;
    private long enrolledStudents;
}
