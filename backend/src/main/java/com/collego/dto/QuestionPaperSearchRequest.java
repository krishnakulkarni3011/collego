package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionPaperSearchRequest {

    private Long courseId;
    private Long departmentId;
    private Integer semesterNumber;
    private Integer year;
    private String examType; // MID_TERM, END_TERM, SUPPLEMENTARY
}
