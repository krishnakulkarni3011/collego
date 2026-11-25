package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassRepresentativeStudentResponse {
    private Long studentId;
    private Long userId;
    private String name;
    private String enrollmentNumber;
    private Integer semester;
    private Integer year;
    private String yearLabel;
    private String section;
    private Boolean isCr;
}
