package com.collego.service;

import com.collego.dto.CreateTimetableSlotRequest;
import com.collego.dto.TimetableSlotResponse;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.SectionRepository;
import com.collego.repository.TimetableSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableSlotRepository timetableSlotRepository;
    private final SectionRepository sectionRepository;

    @Transactional
    public TimetableSlotResponse createSlot(CreateTimetableSlotRequest request) {
        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + request.getSectionId()));

        DayOfWeekEnum dayOfWeek;
        try {
            dayOfWeek = DayOfWeekEnum.valueOf(request.getDayOfWeek().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid day of week: " + request.getDayOfWeek() + ". Must be MON, TUE, WED, THU, FRI, or SAT");
        }

        LocalTime startTime;
        LocalTime endTime;
        try {
            startTime = LocalTime.parse(request.getStartTime());
            endTime = LocalTime.parse(request.getEndTime());
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Invalid time format. Use HH:mm (e.g., 09:00)");
        }

        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException("End time must be after start time");
        }

        TimetableSlot slot = TimetableSlot.builder()
                .section(section)
                .dayOfWeek(dayOfWeek)
                .startTime(startTime)
                .endTime(endTime)
                .roomNumber(request.getRoomNumber())
                .build();

        slot = timetableSlotRepository.save(slot);
        return mapToResponse(slot);
    }

    public List<TimetableSlotResponse> getSlotsBySection(Long sectionId) {
        return timetableSlotRepository.findBySectionId(sectionId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteSlot(Long id) {
        if (!timetableSlotRepository.existsById(id)) {
            throw new ResourceNotFoundException("Timetable slot not found with id: " + id);
        }
        timetableSlotRepository.deleteById(id);
    }

    public List<TimetableSlotResponse> getSlotsBySections(List<Long> sectionIds) {
        return timetableSlotRepository.findBySectionIdInOrderByDayOfWeekAscStartTimeAsc(sectionIds).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private TimetableSlotResponse mapToResponse(TimetableSlot slot) {
        String facultyName = null;
        if (slot.getSection().getFaculty() != null) {
            User facultyUser = slot.getSection().getFaculty().getUser();
            facultyName = facultyUser.getFirstName() + " " + facultyUser.getLastName();
        }

        return TimetableSlotResponse.builder()
                .id(slot.getId())
                .sectionId(slot.getSection().getId())
                .courseName(slot.getSection().getCourse().getName())
                .courseCode(slot.getSection().getCourse().getCode())
                .sectionName(slot.getSection().getName())
                .dayOfWeek(slot.getDayOfWeek().name())
                .startTime(slot.getStartTime().toString())
                .endTime(slot.getEndTime().toString())
                .roomNumber(slot.getRoomNumber())
                .facultyName(facultyName)
                .build();
    }
}
