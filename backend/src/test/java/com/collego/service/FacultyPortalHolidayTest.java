package com.collego.service;

import com.collego.dto.BulkAttendanceRequest;
import com.collego.dto.HolidayRequest;
import com.collego.dto.HolidayResponse;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FacultyPortalHolidayTest {

    @Mock private UserRepository userRepository;
    @Mock private FacultyProfileRepository facultyProfileRepository;
    @Mock private SectionRepository sectionRepository;
    @Mock private AttendanceRepository attendanceRepository;
    @Mock private HolidayRepository holidayRepository;

    @InjectMocks private FacultyPortalService service;

    private final LocalDate date = LocalDate.of(2026, 10, 27);
    private User facultyUser;
    private FacultyProfile faculty;
    private Section section;

    @BeforeEach
    void setUp() {
        Department department = Department.builder().id(1L).name("CSE").code("CSE").build();
        facultyUser = User.builder()
                .id(10L)
                .email("faculty@collego.edu")
                .firstName("Faculty")
                .lastName("Member")
                .isActive(true)
                .build();
        faculty = FacultyProfile.builder()
                .id(20L)
                .user(facultyUser)
                .department(department)
                .isHod(false)
                .build();
        Course course = Course.builder()
                .id(30L)
                .name("Operating Systems")
                .code("CS501")
                .credits(4)
                .department(department)
                .build();
        Semester semester = Semester.builder()
                .id(40L)
                .name("V Semester")
                .number(5)
                .academicYear("2025-26")
                .build();
        section = Section.builder()
                .id(50L)
                .name("A")
                .course(course)
                .semester(semester)
                .faculty(faculty)
                .build();

        when(userRepository.findByEmail("faculty@collego.edu")).thenReturn(Optional.of(facultyUser));
        when(facultyProfileRepository.findByUserId(10L)).thenReturn(Optional.of(faculty));
    }

    private HolidayRequest holidayRequest() {
        HolidayRequest request = new HolidayRequest();
        request.setSectionId(50L);
        request.setDate(date);
        request.setNote("  College holiday  ");
        return request;
    }

    @Test
    void declareHolidayClearsAttendanceAndSavesHoliday() {
        Attendance attendance = Attendance.builder()
                .id(70L)
                .section(section)
                .date(date)
                .status(AttendanceStatus.ABSENT)
                .build();

        when(sectionRepository.findById(50L)).thenReturn(Optional.of(section));
        when(attendanceRepository.findBySectionIdAndDate(50L, date)).thenReturn(List.of(attendance));
        when(holidayRepository.findBySectionIdAndDate(50L, date)).thenReturn(Optional.empty());
        when(holidayRepository.save(any(Holiday.class))).thenAnswer(invocation -> {
            Holiday holiday = invocation.getArgument(0);
            holiday.setId(99L);
            return holiday;
        });

        HolidayResponse response = service.declareHoliday("faculty@collego.edu", holidayRequest());

        assertEquals(99L, response.getId());
        assertEquals(50L, response.getSectionId());
        assertEquals("A", response.getSectionName());
        assertEquals("CS501", response.getCourseCode());
        assertEquals(date, response.getDate());
        assertEquals("College holiday", response.getNote());
        assertEquals("Faculty Member", response.getDeclaredBy());
        verify(attendanceRepository).deleteAll(List.of(attendance));
        verify(holidayRepository).save(any(Holiday.class));
    }

    @Test
    void markAttendanceRejectsHoliday() {
        when(sectionRepository.findById(50L)).thenReturn(Optional.of(section));
        when(holidayRepository.existsBySectionIdAndDate(50L, date)).thenReturn(true);

        BulkAttendanceRequest request = BulkAttendanceRequest.builder()
                .sectionId(50L)
                .date(date)
                .records(List.of())
                .build();

        assertThrows(BadRequestException.class,
                () -> service.markAttendance("faculty@collego.edu", request));
        verify(attendanceRepository, never()).save(any());
    }

    @Test
    void facultyCannotDeclareHolidayForAnotherFacultySection() {
        FacultyProfile other = FacultyProfile.builder()
                .id(21L)
                .user(User.builder().id(11L).email("other@collego.edu").firstName("Other").lastName("Faculty").build())
                .department(faculty.getDepartment())
                .build();
        section.setFaculty(other);

        when(sectionRepository.findById(50L)).thenReturn(Optional.of(section));

        assertThrows(BadRequestException.class,
                () -> service.declareHoliday("faculty@collego.edu", holidayRequest()));
        verify(holidayRepository, never()).save(any());
    }

    @Test
    void removeHolidayDeletesOnlyOwnSectionHoliday() {
        Holiday holiday = Holiday.builder()
                .id(99L)
                .section(section)
                .date(date)
                .declaredBy(facultyUser)
                .build();
        when(holidayRepository.findById(99L)).thenReturn(Optional.of(holiday));

        service.removeHoliday("faculty@collego.edu", 99L);

        verify(holidayRepository).delete(holiday);
    }
}
