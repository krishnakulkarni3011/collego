package com.collego.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionBatchResponse {
    private Long id;
    private Integer fromSemester;
    private Integer toSemester;
    private String academicYear;
    private String status;
    private Integer totalStudents;
    private Integer promoted;
    private Integer heldBack;
    private Integer graduated;
    private String createdBy;
    private LocalDateTime createdAt;
}
