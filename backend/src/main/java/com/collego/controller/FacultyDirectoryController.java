package com.collego.controller;

import com.collego.dto.FacultyDirectoryResponse;
import com.collego.service.FacultyDirectoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

/**
 * Faculty directory for students and admins. Resumes are only downloadable
 * once the administration has approved the faculty member's upload. Faculty
 * members manage their own resume from the Career Profile tab instead of
 * browsing this directory.
 */
@RestController
@RequestMapping("/api/faculty-directory")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class FacultyDirectoryController {

    private final FacultyDirectoryService facultyDirectoryService;

    @GetMapping
    @PreAuthorize("hasAnyRole('STUDENT','ADMIN')")
    public ResponseEntity<List<FacultyDirectoryResponse>> list(
            @RequestParam(required = false) Long departmentId) {
        return ResponseEntity.ok(facultyDirectoryService.listFaculty(departmentId));
    }

    @GetMapping("/{facultyId}/resume")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> downloadResume(@PathVariable Long facultyId, Authentication auth) throws IOException {
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        boolean isOwner = facultyDirectoryService.isOwner(facultyId, auth.getName());

        FacultyDirectoryResponse meta = (isAdmin || isOwner)
                ? facultyDirectoryService.getFacultyForAdmin(facultyId)
                : facultyDirectoryService.getFaculty(facultyId);

        byte[] bytes = (isAdmin || isOwner)
                ? facultyDirectoryService.downloadResume(facultyId)
                : facultyDirectoryService.downloadApprovedResume(facultyId);

        String filename = meta.getResumeFileName() != null ? meta.getResumeFileName() : "faculty-resume.pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
    }
}
