package com.collego.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevaluationResponse {
    private Long id;
    private Long studentId;
    private String studentName;
    private String enrollmentNumber;
    private Long courseId;
    private String courseName;
    private String courseCode;
    private Long semesterId;
    private String semesterName;
    private String reason;
    private String status;
    private String response;
    private LocalDateTime requestedAt;
    private LocalDateTime resolvedAt;
}
