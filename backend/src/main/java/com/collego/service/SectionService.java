package com.collego.service;

import com.collego.dto.AssignFacultyRequest;
import com.collego.dto.CreateSectionRequest;
import com.collego.dto.SectionResponse;
import com.collego.entity.*;
import com.collego.exception.ConflictException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SectionService {

    private final SectionRepository sectionRepository;
    private final CourseRepository courseRepository;
    private final SemesterRepository semesterRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Transactional
    public SectionResponse createSection(CreateSectionRequest request) {
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + request.getCourseId()));

        Semester semester = semesterRepository.findById(request.getSemesterId())
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found with id: " + request.getSemesterId()));

        if (sectionRepository.existsByNameAndCourseIdAndSemesterId(request.getName(), request.getCourseId(), request.getSemesterId())) {
            throw new ConflictException("Section '" + request.getName() + "' already exists for course " + course.getCode() + " in " + semester.getName());
        }

        FacultyProfile faculty = null;
        if (request.getFacultyId() != null) {
            faculty = facultyProfileRepository.findById(request.getFacultyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Faculty not found with id: " + request.getFacultyId()));
        }

        Section section = Section.builder()
                .name(request.getName())
                .course(course)
                .semester(semester)
                .faculty(faculty)
                .maxCapacity(request.getMaxCapacity() != null ? request.getMaxCapacity() : 60)
                .build();

        section = sectionRepository.save(section);
        return mapToResponse(section);
    }

    @Transactional
    public SectionResponse assignFaculty(Long sectionId, AssignFacultyRequest request) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + sectionId));

        FacultyProfile faculty = null;
        if (request.getFacultyId() != null) {
            faculty = facultyProfileRepository.findById(request.getFacultyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Faculty not found with id: " + request.getFacultyId()));
        }

        section.setFaculty(faculty);
        sectionRepository.save(section);
        return mapToResponse(section);
    }

    public List<SectionResponse> getAllSections() {
        return sectionRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<SectionResponse> getSectionsByCourse(Long courseId) {
        return sectionRepository.findByCourseId(courseId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<SectionResponse> getSectionsBySemester(Long semesterId) {
        return sectionRepository.findBySemesterId(semesterId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<SectionResponse> getSectionsByCourseAndSemester(Long courseId, Long semesterId) {
        return sectionRepository.findByCourseIdAndSemesterId(courseId, semesterId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<SectionResponse> getSectionsByDepartment(Long departmentId) {
        return sectionRepository.findByCourseDepartmentId(departmentId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SectionResponse updateClassReps(Long sectionId, String maleClassRep, String femaleClassRep) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + sectionId));
        section.setMaleClassRep(maleClassRep);
        section.setFemaleClassRep(femaleClassRep);
        sectionRepository.save(section);
        return mapToResponse(section);
    }

    private SectionResponse mapToResponse(Section section) {
        long enrolledCount = enrollmentRepository.countBySectionId(section.getId());
        String facultyName = null;
        Long facultyId = null;
        if (section.getFaculty() != null) {
            facultyId = section.getFaculty().getId();
            User facultyUser = section.getFaculty().getUser();
            facultyName = facultyUser.getFirstName() + " " + facultyUser.getLastName();
        }

        return SectionResponse.builder()
                .id(section.getId())
                .name(section.getName())
                .courseId(section.getCourse().getId())
                .courseName(section.getCourse().getName())
                .courseCode(section.getCourse().getCode())
                .courseCredits(section.getCourse().getCredits())
                .semesterId(section.getSemester().getId())
                .semesterName(section.getSemester().getName())
                .facultyId(facultyId)
                .facultyName(facultyName)
                .enrolledCount(enrolledCount)
                .maxCapacity(section.getMaxCapacity())
                .maleClassRep(section.getMaleClassRep())
                .femaleClassRep(section.getFemaleClassRep())
                .createdAt(section.getCreatedAt())
                .build();
    }
}
