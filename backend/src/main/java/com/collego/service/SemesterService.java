package com.collego.service;

import com.collego.dto.CreateSemesterRequest;
import com.collego.dto.SemesterResponse;
import com.collego.entity.Semester;
import com.collego.exception.ConflictException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.SemesterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SemesterService {

    private final SemesterRepository semesterRepository;

    @Transactional
    public SemesterResponse createSemester(CreateSemesterRequest request) {
        if (semesterRepository.existsByNumberAndAcademicYear(request.getNumber(), request.getAcademicYear())) {
            throw new ConflictException("Semester " + request.getNumber() + " already exists for " + request.getAcademicYear());
        }

        Semester semester = Semester.builder()
                .name(request.getName())
                .number(request.getNumber())
                .academicYear(request.getAcademicYear())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isActive(false)
                .build();

        semester = semesterRepository.save(semester);
        return mapToResponse(semester);
    }

    public List<SemesterResponse> getAllSemesters() {
        return semesterRepository.findAllByOrderByNumberDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<SemesterResponse> getActiveSemesters() {
        return semesterRepository.findByIsActiveTrue().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public SemesterResponse getSemesterById(Long id) {
        Semester semester = semesterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found with id: " + id));
        return mapToResponse(semester);
    }

    @Transactional
    public SemesterResponse activateSemester(Long id) {
        Semester semester = semesterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found with id: " + id));
        semester.setActive(true);
        semesterRepository.save(semester);
        return mapToResponse(semester);
    }

    @Transactional
    public SemesterResponse deactivateSemester(Long id) {
        Semester semester = semesterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found with id: " + id));
        semester.setActive(false);
        semesterRepository.save(semester);
        return mapToResponse(semester);
    }

    private SemesterResponse mapToResponse(Semester semester) {
        return SemesterResponse.builder()
                .id(semester.getId())
                .name(semester.getName())
                .number(semester.getNumber())
                .academicYear(semester.getAcademicYear())
                .startDate(semester.getStartDate())
                .endDate(semester.getEndDate())
                .active(semester.isActive())
                .createdAt(semester.getCreatedAt())
                .build();
    }
}
