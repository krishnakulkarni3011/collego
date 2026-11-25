package com.collego.service;

import com.collego.entity.Course;
import com.collego.entity.Department;
import com.collego.entity.Enrollment;
import com.collego.entity.FacultyProfile;
import com.collego.entity.Section;
import com.collego.entity.Semester;
import com.collego.entity.StudentProfile;
import com.collego.entity.User;
import com.collego.exception.BadRequestException;
import com.collego.repository.EnrollmentRepository;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.SectionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FacultySectionPdfServiceTest {

    @Mock private FacultyProfileRepository facultyProfileRepository;
    @Mock private SectionRepository sectionRepository;
    @Mock private EnrollmentRepository enrollmentRepository;

    @InjectMocks private FacultySectionPdfService service;

    @Test
    void generatesStudentDetailsPdfForOwnedSection() {
        User facultyUser = User.builder()
                .id(10L).firstName("Sr").lastName("Karjol").email("prof@collego.edu").build();
        FacultyProfile faculty = FacultyProfile.builder().id(5L).user(facultyUser).build();

        Department department = Department.builder().id(1L).name("Computer Science").code("CSE").build();
        Course course = Course.builder()
                .id(1L).name("Database Management Systems").code("CS301").credits(4)
                .department(department).build();
        Semester semester = Semester.builder()
                .id(1L).name("Semester 3").number(3).academicYear("2025-26").build();
        Section section = Section.builder()
                .id(7L).name("A").course(course).semester(semester).faculty(faculty).build();

        User studentUser = User.builder()
                .id(20L).firstName("Asha").lastName("Rao")
                .email("asha@collego.edu").phone("9999999999").build();
        StudentProfile student = StudentProfile.builder()
                .id(2L).user(studentUser).department(department)
                .enrollmentNumber("2BA23CS001").semester(3).section("A")
                .admissionYear(2023).isCr(true).build();
        Enrollment enrollment = Enrollment.builder().student(student).section(section).build();

        when(facultyProfileRepository.findByUserEmailIgnoreCase("prof@collego.edu"))
                .thenReturn(Optional.of(faculty));
        when(sectionRepository.findById(7L)).thenReturn(Optional.of(section));
        when(enrollmentRepository.findBySectionId(7L)).thenReturn(List.of(enrollment));

        byte[] pdf = service.generateSectionStudentsPdf("prof@collego.edu", 7L);

        assertNotNull(pdf);
        assertTrue(pdf.length > 100);
        assertEquals("%PDF", new String(pdf, 0, 4, StandardCharsets.US_ASCII));
    }

    @Test
    void rejectsSectionOwnedByAnotherFaculty() {
        User facultyUser = User.builder().id(10L).email("prof@collego.edu").build();
        FacultyProfile faculty = FacultyProfile.builder().id(5L).user(facultyUser).build();

        User otherUser = User.builder().id(11L).email("other@collego.edu").build();
        FacultyProfile otherFaculty = FacultyProfile.builder().id(6L).user(otherUser).build();
        Section section = Section.builder().id(7L).name("A").faculty(otherFaculty).build();

        when(facultyProfileRepository.findByUserEmailIgnoreCase("prof@collego.edu"))
                .thenReturn(Optional.of(faculty));
        when(sectionRepository.findById(7L)).thenReturn(Optional.of(section));

        assertThrows(BadRequestException.class,
                () -> service.generateSectionStudentsPdf("prof@collego.edu", 7L));
    }
}
