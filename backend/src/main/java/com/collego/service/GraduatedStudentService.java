package com.collego.service;

import com.collego.dto.GraduatedStudentResponse;
import com.collego.entity.FacultyProfile;
import com.collego.entity.GraduatedStudent;
import com.collego.entity.StudentProfile;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.GraduatedStudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/** Department-wise archive of graduated students (name, USN, department, years only). */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class GraduatedStudentService {

    private final GraduatedStudentRepository repository;
    private final FacultyProfileRepository facultyProfileRepository;

    @Transactional(readOnly = true)
    public List<GraduatedStudentResponse> listAll() {
        return repository.findAllByOrderByDepartmentNameAscEnrollmentNumberAsc().stream()
                .map(this::map)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<GraduatedStudentResponse> listForHod(String email) {
        FacultyProfile hod = facultyProfileRepository.findByUserEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty profile not found"));
        if (!Boolean.TRUE.equals(hod.getIsHod()) || hod.getDepartment() == null) {
            throw new BadRequestException("Only the Head of Department can view graduated students.");
        }
        return repository.findByDepartmentIdOrderByEnrollmentNumberAsc(hod.getDepartment().getId()).stream()
                .map(this::map)
                .collect(Collectors.toList());
    }

    /** Idempotently archives a graduating student. */
    @Transactional
    public void recordGraduation(StudentProfile student, String academicYear) {
        if (student.getUser() == null || student.getEnrollmentNumber() == null) {
            return;
        }
        String years = buildYears(student.getAdmissionYear(), academicYear);
        if (repository.findByEnrollmentNumberAndYears(student.getEnrollmentNumber(), years).isPresent()) {
            return;
        }
        String name = (student.getUser().getFirstName() + " " + student.getUser().getLastName()).trim();
        String deptName = student.getDepartment() != null ? student.getDepartment().getName() : "N/A";
        repository.save(GraduatedStudent.builder()
                .studentId(student.getId())
                .name(name)
                .enrollmentNumber(student.getEnrollmentNumber())
                .departmentId(student.getDepartment() != null ? student.getDepartment().getId() : null)
                .departmentName(deptName)
                .years(years)
                .build());
        log.info("Archived graduated student {} ({})", student.getEnrollmentNumber(), years);
    }

    private String buildYears(Integer admissionYear, String academicYear) {
        int start = admissionYear != null ? admissionYear : LocalDate.now().getYear() - 4;
        int end = LocalDate.now().getYear() + 1;
        if (academicYear != null && !academicYear.isBlank()) {
            String tail = academicYear.substring(academicYear.length() - Math.min(4, academicYear.length()));
            if (tail.matches("\\d{2}|\\d{4}")) {
                int parsed = Integer.parseInt(tail);
                end = parsed < 100 ? (parsed > 50 ? 1900 + parsed : 2000 + parsed) : parsed;
            }
        }
        return start + "-" + String.format("%02d", end % 100);
    }

    private GraduatedStudentResponse map(GraduatedStudent g) {
        return GraduatedStudentResponse.builder()
                .id(g.getId())
                .name(g.getName())
                .usn(g.getEnrollmentNumber())
                .department(g.getDepartmentName())
                .years(g.getYears())
                .build();
    }
}
