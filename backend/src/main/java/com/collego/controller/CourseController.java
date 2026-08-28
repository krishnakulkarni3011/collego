package com.collego.controller;

import com.collego.dto.CreateCourseRequest;
import com.collego.dto.CourseResponse;
import com.collego.service.CourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    @PostMapping("/api/admin/courses")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CourseResponse> createCourse(@Valid @RequestBody CreateCourseRequest request) {
        CourseResponse response = courseService.createCourse(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api/courses")
    public ResponseEntity<List<CourseResponse>> listCourses(@RequestParam(required = false) Long departmentId) {
        List<CourseResponse> courses;
        if (departmentId != null) {
            courses = courseService.getCoursesByDepartment(departmentId);
        } else {
            courses = courseService.getAllCourses();
        }
        return ResponseEntity.ok(courses);
    }

    @GetMapping("/api/courses/{id}")
    public ResponseEntity<CourseResponse> getCourseById(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.getCourseById(id));
    }
}
