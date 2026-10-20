package com.collego.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamResponse {
    private Long id;
    private String name;
    private String examType;
    private Long semesterId;
    private String semesterName;
    private Integer semesterNumber;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private long scheduleCount;
    private boolean hallTicketAvailable;
    private LocalDateTime createdAt;
}
