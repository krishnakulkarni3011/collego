package com.collego.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewScheduleResponse {
    private Long id;
    private Long applicationId;
    private Long jobPostingId;
    private String jobTitle;
    private String companyName;
    private String studentName;
    private String enrollmentNumber;
    private Integer roundNumber;
    private String roundName;
    private LocalDateTime scheduledAt;
    private Integer durationMinutes;
    private String mode;
    private String venue;
    private String meetLink;
    private String outcome;
    private String interviewerNotes;
    private LocalDateTime createdAt;
}
