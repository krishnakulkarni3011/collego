package com.collego.dto;

import lombok.*;

import java.time.LocalDateTime;

/**
 * One class-timetable slot: a department + academic year + section (A/B/C).
 * The HoD uploads one PDF per slot; students see the slot that matches their
 * own department, year and section.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassTimetableResponse {
    private Long id;
    private Long departmentId;
    private String departmentName;
    private Integer year;
    private String yearLabel;
    private String sectionName;
    private String fileName;
    private LocalDateTime uploadedAt;
    private boolean hasFile;
}
