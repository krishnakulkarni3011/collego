package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionResultResponse {
    private Long batchId;
    private String fromSemester;
    private String toSemester;
    private Integer totalStudents;
    private Integer promoted;
    private Integer heldBack;
    private Integer graduated;
    private Integer skipped;
}
