package com.collego.service;

import com.collego.entity.Department;
import com.collego.entity.FacultyProfile;
import com.collego.entity.User;
import com.collego.exception.BadRequestException;
import com.collego.repository.ClassTimetableRepository;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.StudentProfileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClassTimetableServiceTest {

    @Mock private ClassTimetableRepository timetableRepository;
    @Mock private FacultyProfileRepository facultyProfileRepository;
    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private S3StorageService s3StorageService;
    @InjectMocks private ClassTimetableService service;

    private FacultyProfile faculty(String email, boolean hod) {
        return FacultyProfile.builder()
                .id(10L)
                .user(User.builder().email(email).firstName("Test").lastName("Faculty").build())
                .department(Department.builder().id(1L).name("CSE").code("CSE").build())
                .isHod(hod)
                .build();
    }

    @Test
    void nonHodCannotManageTimetables() {
        when(facultyProfileRepository.findByUserEmailIgnoreCase("faculty@collego.edu"))
                .thenReturn(Optional.of(faculty("faculty@collego.edu", false)));

        assertThrows(AccessDeniedException.class,
                () -> service.listForHod("faculty@collego.edu"));
    }

    @Test
    void hodCanOnlyUploadPdf() {
        when(facultyProfileRepository.findByUserEmailIgnoreCase("hod@collego.edu"))
                .thenReturn(Optional.of(faculty("hod@collego.edu", true)));
        MockMultipartFile file = new MockMultipartFile(
                "file", "timetable.txt", "text/plain", "not a pdf".getBytes());

        assertThrows(BadRequestException.class,
                () -> service.uploadForHod("hod@collego.edu", 1, "A", file));
        verifyNoInteractions(s3StorageService);
    }

    @Test
    void hodCannotUploadSpoofedPdf() {
        when(facultyProfileRepository.findByUserEmailIgnoreCase("hod@collego.edu"))
                .thenReturn(Optional.of(faculty("hod@collego.edu", true)));
        MockMultipartFile file = new MockMultipartFile(
                "file", "timetable.pdf", "application/pdf", "not a real pdf".getBytes());

        assertThrows(BadRequestException.class,
                () -> service.uploadForHod("hod@collego.edu", 1, "A", file));
        verifyNoInteractions(s3StorageService);
    }

    @Test
    void studentWithoutProfileGetsNoClassTimetable() {
        when(studentProfileRepository.findByUserEmailIgnoreCase("student@collego.edu"))
                .thenReturn(Optional.empty());

        assertNull(service.getForStudent("student@collego.edu"));
    }
}
