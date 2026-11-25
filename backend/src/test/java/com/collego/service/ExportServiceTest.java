package com.collego.service;

import com.collego.entity.Department;
import com.collego.entity.Role;
import com.collego.entity.StudentProfile;
import com.collego.entity.User;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.StudentProfileRepository;
import com.collego.repository.UserRepository;
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
class ExportServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private FacultyProfileRepository facultyProfileRepository;

    @InjectMocks private ExportService exportService;

    @Test
    void filtersStudentsByDepartmentAndYear() {
        Department cse = Department.builder().id(1L).name("Computer Science").code("CSE").build();
        Department ece = Department.builder().id(2L).name("Electronics").code("ECE").build();

        User cseStudent = studentUser(1L, "Asha", "Rao", "asha@collego.edu", "9999999999");
        User eceStudent = studentUser(2L, "Vikram", "Shetty", "vikram@collego.edu", null);

        StudentProfile cseProfile = StudentProfile.builder()
                .id(11L)
                .user(cseStudent)
                .department(cse)
                .enrollmentNumber("2BA23CS001")
                .semester(3)
                .section("A")
                .admissionYear(2023)
                .isCr(true)
                .build();
        StudentProfile eceProfile = StudentProfile.builder()
                .id(12L)
                .user(eceStudent)
                .department(ece)
                .enrollmentNumber("2BA23EC001")
                .semester(5)
                .section("B")
                .admissionYear(2023)
                .isCr(false)
                .build();

        when(userRepository.findByRole(Role.STUDENT)).thenReturn(List.of(cseStudent, eceStudent));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(cseProfile));
        when(studentProfileRepository.findByUserId(2L)).thenReturn(Optional.of(eceProfile));

        String csv = new String(exportService.studentsCsv(1L, 2), StandardCharsets.UTF_8);

        assertTrue(csv.contains("2BA23CS001"));
        assertTrue(csv.contains("Asha"));
        assertTrue(csv.contains("II Year"));
        assertTrue(csv.contains("Yes"));
        assertFalse(csv.contains("2BA23EC001"));
        assertFalse(csv.contains("Vikram"));
    }

    @Test
    void unfilteredExportIncludesAllStudentsAndDetailsHeader() {
        User student = studentUser(1L, "Asha", "Rao", "asha@collego.edu", "9999999999");
        StudentProfile profile = StudentProfile.builder()
                .id(11L)
                .user(student)
                .enrollmentNumber("2BA23CS001")
                .semester(1)
                .section("A")
                .admissionYear(2023)
                .build();

        when(userRepository.findByRole(Role.STUDENT)).thenReturn(List.of(student));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(profile));

        String csv = new String(exportService.studentsCsv(), StandardCharsets.UTF_8);

        assertTrue(csv.startsWith("USN,First Name,Last Name,Email,Phone,Department,Semester,Year,Section,Admission Year,CR,Active"));
        assertTrue(csv.contains("2BA23CS001"));
        assertTrue(csv.contains("I Year"));
    }

    private User studentUser(Long id, String firstName, String lastName, String email, String phone) {
        return User.builder()
                .id(id)
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .phone(phone)
                .role(Role.STUDENT)
                .isActive(true)
                .build();
    }
}
