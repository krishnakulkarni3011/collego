package com.collego.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkAttendanceRequest {

    @NotNull(message = "Section ID is required")
    private Long sectionId;

    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotNull(message = "Attendance records are required")
    private List<StudentAttendanceEntry> records;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentAttendanceEntry {
        @NotNull(message = "Student ID is required")
        private Long studentId;

        @NotNull(message = "Status is required")
        private String status; // PRESENT or ABSENT
    }
}
