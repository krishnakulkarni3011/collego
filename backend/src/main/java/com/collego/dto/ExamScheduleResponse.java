package com.collego.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamScheduleResponse {
    private Long id;
    private Long examId;
    private Long courseId;
    private String courseName;
    private String courseCode;
    private Long sectionId;
    private String sectionName;
    private LocalDate examDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String room;
    private Long invigilatorId;
    private String invigilatorName;
    private long studentCount;
    private LocalDateTime createdAt;
}
