package com.collego.service;

import com.collego.dto.CreateCourseRequest;
import com.collego.dto.CourseResponse;
import com.collego.entity.Course;
import com.collego.entity.Department;
import com.collego.exception.ConflictException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.CourseRepository;
import com.collego.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;
    private final DepartmentRepository departmentRepository;

    @Transactional
    public CourseResponse createCourse(CreateCourseRequest request) {
        if (courseRepository.existsByCode(request.getCode())) {
            throw new ConflictException("Course code already exists: " + request.getCode());
        }

        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + request.getDepartmentId()));

        Course course = Course.builder()
                .name(request.getName())
                .code(request.getCode())
                .credits(request.getCredits())
                .department(department)
                .description(request.getDescription())
                .build();

        course = courseRepository.save(course);
        return mapToResponse(course);
    }

    public List<CourseResponse> getAllCourses() {
        return courseRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<CourseResponse> getCoursesByDepartment(Long departmentId) {
        return courseRepository.findByDepartmentId(departmentId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public CourseResponse getCourseById(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));
        return mapToResponse(course);
    }

    private CourseResponse mapToResponse(Course course) {
        return CourseResponse.builder()
                .id(course.getId())
                .name(course.getName())
                .code(course.getCode())
                .credits(course.getCredits())
                .departmentId(course.getDepartment().getId())
                .departmentName(course.getDepartment().getName())
                .description(course.getDescription())
                .createdAt(course.getCreatedAt())
                .build();
    }
}
