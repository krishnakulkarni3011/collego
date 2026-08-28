package com.collego.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OverallAttendanceResponse {
    private long totalClasses;
    private long totalPresent;
    private double overallPercentage;
    private List<SubjectAttendanceResponse> subjectWise;
}
