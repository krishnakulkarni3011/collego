package com.collego.service;

import com.collego.dto.HolidayResponse;
import com.collego.entity.Holiday;
import com.collego.entity.Section;
import com.collego.entity.User;

/**
 * Maps a holiday within an active transaction so lazy section/course/user
 * associations can be read safely.
 */
final class HolidayMapper {

    private HolidayMapper() {
    }

    static HolidayResponse toResponse(Holiday holiday) {
        Section section = holiday.getSection();
        User declaredBy = holiday.getDeclaredBy();

        String declaredByName = null;
        if (declaredBy != null) {
            String first = declaredBy.getFirstName() != null ? declaredBy.getFirstName().trim() : "";
            String last = declaredBy.getLastName() != null ? declaredBy.getLastName().trim() : "";
            declaredByName = (first + " " + last).trim();
        }

        return HolidayResponse.builder()
                .id(holiday.getId())
                .sectionId(section != null ? section.getId() : null)
                .sectionName(section != null ? section.getName() : null)
                .courseId(section != null && section.getCourse() != null ? section.getCourse().getId() : null)
                .courseName(section != null && section.getCourse() != null ? section.getCourse().getName() : null)
                .courseCode(section != null && section.getCourse() != null ? section.getCourse().getCode() : null)
                .date(holiday.getDate())
                .note(holiday.getNote())
                .declaredBy(declaredByName)
                .createdAt(holiday.getCreatedAt())
                .build();
    }
}
