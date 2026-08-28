package com.collego.controller;

import com.collego.dto.AssignFacultyRequest;
import com.collego.dto.CreateSectionRequest;
import com.collego.dto.SectionResponse;
import com.collego.service.SectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class SectionController {

    private final SectionService sectionService;

    @PostMapping("/api/admin/sections")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SectionResponse> createSection(@Valid @RequestBody CreateSectionRequest request) {
        SectionResponse response = sectionService.createSection(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/api/admin/sections/{id}/assign-faculty")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SectionResponse> assignFaculty(@PathVariable Long id, @RequestBody AssignFacultyRequest request) {
        return ResponseEntity.ok(sectionService.assignFaculty(id, request));
    }

    @GetMapping("/api/sections")
    public ResponseEntity<List<SectionResponse>> listSections(
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long semesterId) {
        List<SectionResponse> sections;
        if (courseId != null && semesterId != null) {
            sections = sectionService.getSectionsByCourseAndSemester(courseId, semesterId);
        } else if (courseId != null) {
            sections = sectionService.getSectionsByCourse(courseId);
        } else if (semesterId != null) {
            sections = sectionService.getSectionsBySemester(semesterId);
        } else {
            sections = sectionService.getAllSections();
        }
        return ResponseEntity.ok(sections);
    }
}
