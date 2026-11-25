package com.collego.controller;

import com.collego.dto.ClassRepresentativeStudentResponse;
import com.collego.service.ClassRepresentativeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * HoD-only endpoints for choosing the class representative of a
 * department + academic year + section.
 */
@RestController
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ClassRepresentativeController {

    private final ClassRepresentativeService classRepresentativeService;

    @GetMapping("/api/faculty/hod/cr/students")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<List<ClassRepresentativeStudentResponse>> listStudents(
            Authentication auth,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String section) {
        return ResponseEntity.ok(classRepresentativeService.listStudents(auth.getName(), year, section));
    }

    @PutMapping("/api/faculty/hod/cr/{studentId}")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ClassRepresentativeStudentResponse> assign(
            Authentication auth, @PathVariable Long studentId) {
        return ResponseEntity.ok(classRepresentativeService.assign(auth.getName(), studentId));
    }

    @DeleteMapping("/api/faculty/hod/cr/{studentId}")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<Void> remove(Authentication auth, @PathVariable Long studentId) {
        classRepresentativeService.remove(auth.getName(), studentId);
        return ResponseEntity.noContent().build();
    }
}
