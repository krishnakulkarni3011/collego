package com.collego.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationResponse {
    private Long id;
    private Long studentId;
    private String studentName;
    private String enrollmentNumber;
    private String departmentName;
    private Long jobPostingId;
    private String jobTitle;
    private String companyName;
    private Long resumeId;
    private String resumeFileName;
    private String status;
    private String coverNote;
    private String adminNotes;
    private Double cgpaAtApplication;
    private LocalDateTime appliedAt;
    private LocalDateTime statusUpdatedAt;
}
