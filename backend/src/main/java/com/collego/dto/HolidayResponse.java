package com.collego.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HolidayResponse {
    private Long id;
    private Long sectionId;
    private String sectionName;
    private Long courseId;
    private String courseName;
    private String courseCode;
    private LocalDate date;
    private String note;
    private String declaredBy;
    private LocalDateTime createdAt;
}
