package com.collego.service;

import com.collego.dto.ClassRepresentativeStudentResponse;
import com.collego.entity.Department;
import com.collego.entity.FacultyProfile;
import com.collego.entity.StudentProfile;
import com.collego.entity.User;
import com.collego.exception.BadRequestException;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.StudentProfileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClassRepresentativeServiceTest {

    @Mock private FacultyProfileRepository facultyProfileRepository;
    @Mock private StudentProfileRepository studentProfileRepository;
    @InjectMocks private ClassRepresentativeService service;

    private final Department cse = Department.builder().id(1L).name("CSE").code("CSE").build();
    private final Department ece = Department.builder().id(2L).name("ECE").code("ECE").build();

    private User user(long id, String email, String first, String last) {
        return User.builder().id(id).email(email).firstName(first).lastName(last)
                .isActive(true).build();
    }

    private StudentProfile student(long id, Department department, int semester,
                                   String section, String enrollment, boolean isCr) {
        return StudentProfile.builder()
                .id(id)
                .user(user(id + 100, enrollment.toLowerCase() + "@collego.edu", "Student", enrollment))
                .department(department)
                .semester(semester)
                .section(section)
                .enrollmentNumber(enrollment)
                .isCr(isCr)
                .build();
    }

    private FacultyProfile hod(String email) {
        return FacultyProfile.builder()
                .id(50L)
                .user(user(50L, email, "Head", "Faculty"))
                .department(cse)
                .isHod(true)
                .build();
    }

    @Test
    void assignDemotesPreviousCrOnlyInSameClass() {
        FacultyProfile hod = hod("hod@collego.edu");
        StudentProfile selected = student(1L, cse, 5, "A", "2BA24CS001", false);
        StudentProfile previousCr = student(2L, cse, 6, "A", "2BA24CS002", true);
        StudentProfile otherClassCr = student(3L, cse, 5, "B", "2BA24CS003", true);

        when(facultyProfileRepository.findByUserEmailIgnoreCase("hod@collego.edu"))
                .thenReturn(Optional.of(hod));
        when(studentProfileRepository.findById(1L)).thenReturn(Optional.of(selected));
        when(studentProfileRepository.findByDepartmentId(1L))
                .thenReturn(List.of(selected, previousCr, otherClassCr));

        ClassRepresentativeStudentResponse response = service.assign("hod@collego.edu", 1L);

        assertTrue(Boolean.TRUE.equals(selected.getIsCr()));
        assertFalse(Boolean.TRUE.equals(previousCr.getIsCr()));
        assertTrue(Boolean.TRUE.equals(otherClassCr.getIsCr()));
        assertTrue(Boolean.TRUE.equals(response.getIsCr()));
        assertEquals("III Year", response.getYearLabel());
        verify(studentProfileRepository).save(previousCr);
        verify(studentProfileRepository).save(selected);
    }

    @Test
    void assignRejectsStudentFromAnotherDepartment() {
        StudentProfile selected = student(1L, ece, 5, "A", "2BA24EC001", false);
        when(facultyProfileRepository.findByUserEmailIgnoreCase("hod@collego.edu"))
                .thenReturn(Optional.of(hod("hod@collego.edu")));
        when(studentProfileRepository.findById(1L)).thenReturn(Optional.of(selected));

        assertThrows(AccessDeniedException.class, () -> service.assign("hod@collego.edu", 1L));
        verify(studentProfileRepository, never()).save(any());
    }

    @Test
    void assignRejectsStudentWithoutSection() {
        StudentProfile selected = student(1L, cse, 5, " ", "2BA24CS001", false);
        when(facultyProfileRepository.findByUserEmailIgnoreCase("hod@collego.edu"))
                .thenReturn(Optional.of(hod("hod@collego.edu")));
        when(studentProfileRepository.findById(1L)).thenReturn(Optional.of(selected));

        assertThrows(BadRequestException.class, () -> service.assign("hod@collego.edu", 1L));
    }

    @Test
    void nonHodCannotListOrAssign() {
        FacultyProfile faculty = hod("faculty@collego.edu");
        faculty.setIsHod(false);
        when(facultyProfileRepository.findByUserEmailIgnoreCase("faculty@collego.edu"))
                .thenReturn(Optional.of(faculty));

        assertThrows(AccessDeniedException.class, () -> service.listStudents("faculty@collego.edu", null, null));
        assertThrows(AccessDeniedException.class, () -> service.assign("faculty@collego.edu", 1L));
    }

    @Test
    void removeClearsCrFlag() {
        StudentProfile selected = student(1L, cse, 5, "A", "2BA24CS001", true);
        when(facultyProfileRepository.findByUserEmailIgnoreCase("hod@collego.edu"))
                .thenReturn(Optional.of(hod("hod@collego.edu")));
        when(studentProfileRepository.findById(1L)).thenReturn(Optional.of(selected));

        service.remove("hod@collego.edu", 1L);

        assertFalse(Boolean.TRUE.equals(selected.getIsCr()));
        verify(studentProfileRepository).save(selected);
    }
}
