package com.collego.controller;

import com.collego.dto.FacultyAllStudentResponse;
import com.collego.service.FacultyPortalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/** Faculty lookup of students belonging to one department (backlog / open elective picker). */
@RestController
@RequestMapping("/api/faculty")
@RequiredArgsConstructor
@PreAuthorize("hasRole('FACULTY')")
@SuppressWarnings("null")
public class FacultyStudentLookupController {

    private final FacultyPortalService facultyPortalService;

    @GetMapping("/departments/{departmentId}/students")
    public ResponseEntity<List<FacultyAllStudentResponse>> listStudentsByDepartment(
            Authentication auth, @PathVariable Long departmentId) {
        List<FacultyAllStudentResponse> students = facultyPortalService
                .getAllStudentsForFaculty(auth.getName())
                .stream()
                .filter(s -> Objects.equals(s.getDepartmentId(), departmentId))
                .collect(Collectors.toList());
        return ResponseEntity.ok(students);
    }
}
