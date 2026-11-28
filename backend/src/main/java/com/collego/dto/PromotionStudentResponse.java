package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionStudentResponse {
    private Long studentId;
    private String name;
    private String usn;
    private String departmentName;
    private String section;
    /** Informational only: 0 when no attendance recorded. */
    private Double attendancePercentage;
    /** Informational only. */
    private Integer backlogCount;
    /** Default outcome: PROMOTE or GRADUATE for semester 8. */
    private String defaultOutcome;
}
