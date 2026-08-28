package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableSlotResponse {
    private Long id;
    private Long sectionId;
    private String courseName;
    private String courseCode;
    private String sectionName;
    private String dayOfWeek;
    private String startTime;
    private String endTime;
    private String roomNumber;
    private String facultyName;
}
