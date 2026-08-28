package com.collego.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentResponse {
    private Long id;
    private Long studentId;
    private String studentName;
    private String enrollmentNumber;
    private Long sectionId;
    private String sectionName;
    private String courseName;
    private String courseCode;
    private String status;
    private LocalDateTime enrolledAt;
}
