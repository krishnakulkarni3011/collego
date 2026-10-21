package com.collego.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentResponse {
    private Long id;
    private Long sectionId;
    private String courseName;
    private String courseCode;
    private String title;
    private String description;
    private LocalDate dueDate;
    private String fileName;
    private Boolean hasFile; // true if a file is uploaded to S3 and downloadable
    private LocalDateTime createdAt;
    private Integer maxMarks;

    // Faculty view
    private Long submissionCount;
    private Long gradedCount;

    // Student view (populated for the requesting student)
    private Long submissionId;
    private String submissionStatus; // SUBMITTED | GRADED | null (not submitted)
    private java.math.BigDecimal marks;
    private String feedback;
    private LocalDateTime submittedAt;
    private Boolean late;

    /** True when the requesting student is enrolled in the assignment's section and can submit. */
    private Boolean canSubmit;
}
