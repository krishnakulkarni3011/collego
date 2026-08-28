package com.collego.service;

import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.exception.ConflictException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SectionRepository sectionRepository;

    @Transactional
    public EnrollmentResponse enrollStudent(EnrollStudentRequest request) {
        StudentProfile student = studentProfileRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + request.getStudentId()));

        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + request.getSectionId()));

        if (enrollmentRepository.existsByStudentIdAndSectionId(request.getStudentId(), request.getSectionId())) {
            throw new ConflictException("Student is already enrolled in this section");
        }

        long currentCount = enrollmentRepository.countBySectionId(request.getSectionId());
        if (currentCount >= section.getMaxCapacity()) {
            throw new BadRequestException("Section is at full capacity (" + section.getMaxCapacity() + ")");
        }

        Enrollment enrollment = Enrollment.builder()
                .student(student)
                .section(section)
                .status(EnrollmentStatus.ACTIVE)
                .build();

        enrollment = enrollmentRepository.save(enrollment);
        return mapToResponse(enrollment);
    }

    @Transactional
    public List<EnrollmentResponse> bulkEnroll(BulkEnrollRequest request) {
        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + request.getSectionId()));

        List<EnrollmentResponse> results = new ArrayList<>();
        for (Long studentId : request.getStudentIds()) {
            if (enrollmentRepository.existsByStudentIdAndSectionId(studentId, request.getSectionId())) {
                continue; // Skip already enrolled
            }

            StudentProfile student = studentProfileRepository.findById(studentId).orElse(null);
            if (student == null) continue;

            Enrollment enrollment = Enrollment.builder()
                    .student(student)
                    .section(section)
                    .status(EnrollmentStatus.ACTIVE)
                    .build();

            enrollment = enrollmentRepository.save(enrollment);
            results.add(mapToResponse(enrollment));
        }

        return results;
    }

    public List<EnrollmentResponse> getStudentEnrollments(Long studentId) {
        return enrollmentRepository.findByStudentId(studentId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<EnrollmentResponse> getSectionEnrollments(Long sectionId) {
        return enrollmentRepository.findBySectionId(sectionId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private EnrollmentResponse mapToResponse(Enrollment enrollment) {
        User studentUser = enrollment.getStudent().getUser();
        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .studentId(enrollment.getStudent().getId())
                .studentName(studentUser.getFirstName() + " " + studentUser.getLastName())
                .enrollmentNumber(enrollment.getStudent().getEnrollmentNumber())
                .sectionId(enrollment.getSection().getId())
                .sectionName(enrollment.getSection().getName())
                .courseName(enrollment.getSection().getCourse().getName())
                .courseCode(enrollment.getSection().getCourse().getCode())
                .status(enrollment.getStatus().name())
                .enrolledAt(enrollment.getEnrolledAt())
                .build();
    }
}
