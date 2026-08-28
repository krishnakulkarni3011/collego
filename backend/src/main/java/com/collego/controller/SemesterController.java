package com.collego.controller;

import com.collego.dto.CreateSemesterRequest;
import com.collego.dto.SemesterResponse;
import com.collego.service.SemesterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class SemesterController {

    private final SemesterService semesterService;

    @PostMapping("/api/admin/semesters")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SemesterResponse> createSemester(@Valid @RequestBody CreateSemesterRequest request) {
        SemesterResponse response = semesterService.createSemester(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api/semesters")
    public ResponseEntity<List<SemesterResponse>> listSemesters() {
        return ResponseEntity.ok(semesterService.getAllSemesters());
    }

    @GetMapping("/api/semesters/active")
    public ResponseEntity<List<SemesterResponse>> listActiveSemesters() {
        return ResponseEntity.ok(semesterService.getActiveSemesters());
    }

    @GetMapping("/api/semesters/{id}")
    public ResponseEntity<SemesterResponse> getSemesterById(@PathVariable Long id) {
        return ResponseEntity.ok(semesterService.getSemesterById(id));
    }

    @PutMapping("/api/admin/semesters/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SemesterResponse> activateSemester(@PathVariable Long id) {
        return ResponseEntity.ok(semesterService.activateSemester(id));
    }

    @PutMapping("/api/admin/semesters/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SemesterResponse> deactivateSemester(@PathVariable Long id) {
        return ResponseEntity.ok(semesterService.deactivateSemester(id));
    }
}
