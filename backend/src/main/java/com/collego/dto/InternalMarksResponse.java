package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalMarksResponse {
    private Long sectionId;
    private String courseName;
    private String courseCode;
    private Integer credits;
    private Double ia1MaxMarks;
    private Double ia1ObtainedMarks;
    private Double ia2MaxMarks;
    private Double ia2ObtainedMarks;
}
