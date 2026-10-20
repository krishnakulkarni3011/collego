package com.collego.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatingRowResponse {
    private Long scheduleId;
    private Long examId;
    private String courseName;
    private String courseCode;
    private LocalDate examDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String room;
    private Integer seatNumber;
    private Long studentId;
    private String studentName;
    private String enrollmentNumber;
    private String sectionName;
    private String invigilatorName;
}
