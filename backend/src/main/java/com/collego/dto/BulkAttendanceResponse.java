package com.collego.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkAttendanceResponse {
    private Long sectionId;
    private LocalDate date;
    private int totalStudents;
    private int markedPresent;
    private int markedAbsent;
    private String message;
}
