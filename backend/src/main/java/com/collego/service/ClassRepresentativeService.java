package com.collego.service;

import com.collego.dto.ClassRepresentativeStudentResponse;
import com.collego.entity.FacultyProfile;
import com.collego.entity.StudentProfile;
import com.collego.entity.User;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.StudentProfileRepository;
import com.collego.util.AcademicYearUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * HoD-managed class representatives. A CR belongs to one class
 * (department + academic year + section) and is stored on the student profile
 * so the student's own portal can display the role.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class ClassRepresentativeService {

    private final FacultyProfileRepository facultyProfileRepository;
    private final StudentProfileRepository studentProfileRepository;

    @Transactional(readOnly = true)
    public List<ClassRepresentativeStudentResponse> listStudents(String email, Integer year, String section) {
        FacultyProfile hod = requireHod(email);
        String sectionFilter = normaliseSection(section);

        return studentProfileRepository.findByDepartmentId(hod.getDepartment().getId()).stream()
                .filter(s -> s.getUser() != null && s.getUser().isActive())
                .filter(s -> year == null || Objects.equals(AcademicYearUtils.fromSemester(s.getSemester()), year))
                .filter(s -> sectionFilter.isBlank() || normaliseSection(s.getSection()).equals(sectionFilter))
                .sorted(Comparator
                        .comparingInt((StudentProfile s) -> Optional.ofNullable(
                                AcademicYearUtils.fromSemester(s.getSemester())).orElse(0))
                        .thenComparing(s -> normaliseSection(s.getSection()))
                        .thenComparing(s -> Optional.ofNullable(s.getEnrollmentNumber()).orElse("")))
                .map(this::map)
                .collect(Collectors.toList());
    }

    @Transactional
    public ClassRepresentativeStudentResponse assign(String email, Long studentId) {
        FacultyProfile hod = requireHod(email);
        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));

        if (student.getUser() == null || !student.getUser().isActive()) {
            throw new BadRequestException("This student account is not active.");
        }
        if (student.getDepartment() == null
                || !Objects.equals(student.getDepartment().getId(), hod.getDepartment().getId())) {
            throw new AccessDeniedException("You can only choose a CR from your own department.");
        }

        Integer year = AcademicYearUtils.fromSemester(student.getSemester());
        String section = normaliseSection(student.getSection());
        if (year == null || section.isBlank()) {
            throw new BadRequestException(
                    "This student needs a valid semester and section before they can be a CR.");
        }

        // Only one CR per class: demote any other CR in the same year + section.
        for (StudentProfile other : studentProfileRepository.findByDepartmentId(hod.getDepartment().getId())) {
            if (Objects.equals(other.getId(), student.getId())) {
                continue;
            }
            boolean sameClass = Objects.equals(
                    AcademicYearUtils.fromSemester(other.getSemester()), year)
                    && normaliseSection(other.getSection()).equals(section);
            if (sameClass && Boolean.TRUE.equals(other.getIsCr())) {
                other.setIsCr(false);
                studentProfileRepository.save(other);
            }
        }

        student.setIsCr(true);
        studentProfileRepository.save(student);
        log.info("HoD {} chose student {} as CR for {} section {}",
                email, student.getId(), AcademicYearUtils.label(year), section);
        return map(student);
    }

    @Transactional
    public void remove(String email, Long studentId) {
        FacultyProfile hod = requireHod(email);
        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));

        if (student.getDepartment() == null
                || !Objects.equals(student.getDepartment().getId(), hod.getDepartment().getId())) {
            throw new AccessDeniedException("You can only manage CRs in your own department.");
        }

        student.setIsCr(false);
        studentProfileRepository.save(student);
        log.info("HoD {} removed student {} as CR", email, student.getId());
    }

    private FacultyProfile requireHod(String email) {
        FacultyProfile faculty = facultyProfileRepository.findByUserEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty profile not found"));
        if (!Boolean.TRUE.equals(faculty.getIsHod())) {
            throw new AccessDeniedException("Only the Head of Department can choose class representatives.");
        }
        if (faculty.getDepartment() == null) {
            throw new BadRequestException("Your faculty profile has no department assigned.");
        }
        return faculty;
    }

    private ClassRepresentativeStudentResponse map(StudentProfile student) {
        User user = student.getUser();
        Integer year = AcademicYearUtils.fromSemester(student.getSemester());
        String name = user != null
                ? ((user.getFirstName() != null ? user.getFirstName().trim() : "") + " "
                        + (user.getLastName() != null ? user.getLastName().trim() : "")).trim()
                : "Student";

        return ClassRepresentativeStudentResponse.builder()
                .studentId(student.getId())
                .userId(user != null ? user.getId() : null)
                .name(name.isBlank() ? "Student" : name)
                .enrollmentNumber(student.getEnrollmentNumber())
                .semester(student.getSemester())
                .year(year)
                .yearLabel(AcademicYearUtils.label(year))
                .section(student.getSection())
                .isCr(Boolean.TRUE.equals(student.getIsCr()))
                .build();
    }

    private String normaliseSection(String section) {
        return section == null ? "" : section.trim().toUpperCase(Locale.ROOT);
    }
}
