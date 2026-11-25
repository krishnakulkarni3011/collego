package com.collego.dto;

import lombok.*;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentTimetableResponse {
    private Map<String, List<TimetableSlotResponse>> weeklySchedule;
    /** PDF uploaded by the HoD for the student's department + year + section. */
    private ClassTimetableResponse classTimetable;
}
