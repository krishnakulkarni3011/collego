package com.collego.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentSubmissionResponse {
    private Long id;
    private Long assignmentId;
    private String assignmentTitle;
    private Long sectionId;
    private String courseName;
    private String courseCode;

    private Long studentId;
    private String studentName;
    private String enrollmentNumber;

    private String fileName;
    private Long fileSize;
    private String note;
    private boolean late;
    private boolean hasFile;

    private String status;
    private BigDecimal marks;
    private Integer maxMarks;
    private String feedback;
    private LocalDateTime submittedAt;
    private LocalDateTime gradedAt;
}
