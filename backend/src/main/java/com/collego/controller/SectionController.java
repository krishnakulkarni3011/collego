package com.collego.controller;

import com.collego.dto.AssignFacultyRequest;
import com.collego.dto.CreateSectionRequest;
import com.collego.dto.SectionResponse;
import com.collego.service.SectionService;
import com.collego.service.SectionTimetableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class SectionController {

    private final SectionService sectionService;
    private final SectionTimetableService sectionTimetableService;

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

    @PutMapping("/api/admin/sections/{id}/class-reps")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SectionResponse> updateClassReps(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(sectionService.updateClassReps(id,
                body.get("maleClassRep"), body.get("femaleClassRep")));
    }

    // ── Timetable PDF endpoints ────────────────────────────────────────────────

    @PostMapping("/api/admin/sections/{id}/timetable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadTimetable(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(sectionTimetableService.uploadTimetable(id, file));
    }

    @GetMapping("/api/sections/{id}/timetable/meta")
    public ResponseEntity<Map<String, Object>> getTimetableMeta(@PathVariable Long id) {
        Map<String, Object> meta = sectionTimetableService.getTimetableMeta(id);
        return meta != null ? ResponseEntity.ok(meta) : ResponseEntity.noContent().build();
    }

    @GetMapping("/api/sections/{id}/timetable")
    public ResponseEntity<byte[]> viewTimetable(@PathVariable Long id) throws IOException {
        byte[] data = sectionTimetableService.downloadTimetable(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"timetable.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }

    @DeleteMapping("/api/admin/sections/{id}/timetable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTimetable(@PathVariable Long id) {
        sectionTimetableService.deleteTimetable(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/sections")
    public ResponseEntity<List<SectionResponse>> listSections(
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long semesterId,
            @RequestParam(required = false) Long departmentId) {
        List<SectionResponse> sections;
        if (courseId != null && semesterId != null) {
            sections = sectionService.getSectionsByCourseAndSemester(courseId, semesterId);
        } else if (courseId != null) {
            sections = sectionService.getSectionsByCourse(courseId);
        } else if (semesterId != null) {
            sections = sectionService.getSectionsBySemester(semesterId);
        } else if (departmentId != null) {
            sections = sectionService.getSectionsByDepartment(departmentId);
        } else {
            sections = sectionService.getAllSections();
        }
        return ResponseEntity.ok(sections);
    }
}
