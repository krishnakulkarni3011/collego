package com.collego.controller;

import com.collego.dto.FacultyDirectoryResponse;
import com.collego.service.FacultyDirectoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

/**
 * Read-only faculty directory for students, faculty and admins, including
 * downloadable resumes uploaded by the administration.
 */
@RestController
@RequestMapping("/api/faculty-directory")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class FacultyDirectoryController {

    private final FacultyDirectoryService facultyDirectoryService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<FacultyDirectoryResponse>> list(
            @RequestParam(required = false) Long departmentId) {
        return ResponseEntity.ok(facultyDirectoryService.listFaculty(departmentId));
    }

    @GetMapping("/{facultyId}/resume")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> downloadResume(@PathVariable Long facultyId) throws IOException {
        FacultyDirectoryResponse faculty = facultyDirectoryService.getFaculty(facultyId);
        byte[] bytes = facultyDirectoryService.downloadResume(facultyId);
        String filename = faculty.getResumeFileName() != null
                ? faculty.getResumeFileName() : "faculty-resume.pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
    }
}
