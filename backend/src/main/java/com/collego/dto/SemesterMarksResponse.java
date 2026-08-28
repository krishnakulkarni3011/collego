package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SemesterMarksResponse {
    private Long sectionId;
    private String courseName;
    private String courseCode;
    private Integer credits;
    private Double maxMarks;
    private Double obtainedMarks;
    private String grade;
    private Double gradePoints;
}
