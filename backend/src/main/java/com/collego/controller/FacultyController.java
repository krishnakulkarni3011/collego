package com.collego.controller;

import com.collego.dto.*;
import com.collego.service.FacultyPortalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/faculty")
@PreAuthorize("hasRole('FACULTY')")
@RequiredArgsConstructor
public class FacultyController {

    private final FacultyPortalService facultyPortalService;

    // ==================== Sections ====================

    @GetMapping("/sections")
    public ResponseEntity<List<FacultySectionResponse>> getAssignedSections(Authentication auth) {
        return ResponseEntity.ok(facultyPortalService.getAssignedSections(auth.getName()));
    }

    // ==================== Attendance ====================

    @PostMapping("/attendance")
    public ResponseEntity<BulkAttendanceResponse> markAttendance(
            Authentication auth,
            @Valid @RequestBody BulkAttendanceRequest request) {
        return ResponseEntity.ok(facultyPortalService.markAttendance(auth.getName(), request));
    }

    @GetMapping("/attendance/{sectionId}")
    public ResponseEntity<List<Map<String, Object>>> getAttendanceForSection(
            Authentication auth,
            @PathVariable Long sectionId) {
        return ResponseEntity.ok(facultyPortalService.getAttendanceForSection(auth.getName(), sectionId));
    }

    // ==================== Internal Marks ====================

    @PostMapping("/marks/internal")
    public ResponseEntity<Map<String, Object>> uploadInternalMarks(
            Authentication auth,
            @Valid @RequestBody UploadMarksRequest request) {
        return ResponseEntity.ok(facultyPortalService.uploadInternalMarks(auth.getName(), request));
    }

    @GetMapping("/marks/internal/{sectionId}")
    public ResponseEntity<List<Map<String, Object>>> getInternalMarksForSection(
            Authentication auth,
            @PathVariable Long sectionId) {
        return ResponseEntity.ok(facultyPortalService.getInternalMarksForSection(auth.getName(), sectionId));
    }

    // ==================== Semester Marks ====================

    @PostMapping("/marks/semester")
    public ResponseEntity<Map<String, Object>> uploadSemesterMarks(
            Authentication auth,
            @Valid @RequestBody UploadSemesterMarksRequest request) {
        return ResponseEntity.ok(facultyPortalService.uploadSemesterMarks(auth.getName(), request));
    }

    // ==================== Assignments ====================

    @PostMapping("/assignments")
    public ResponseEntity<AssignmentResponse> createAssignment(
            Authentication auth,
            @Valid @RequestBody CreateAssignmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(facultyPortalService.createAssignment(auth.getName(), request));
    }

    @GetMapping("/assignments/{sectionId}")
    public ResponseEntity<List<AssignmentResponse>> getAssignments(
            Authentication auth,
            @PathVariable Long sectionId) {
        return ResponseEntity.ok(facultyPortalService.getAssignments(auth.getName(), sectionId));
    }

    /** Phase 8: Upload a file to an existing assignment (multipart) */
    @PostMapping(value = "/assignments/{assignmentId}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AssignmentResponse> uploadAssignmentFile(
            Authentication auth,
            @PathVariable Long assignmentId,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(
                facultyPortalService.uploadAssignmentFile(auth.getName(), assignmentId, file));
    }

    /** Phase 8: Download the file for an assignment */
    @GetMapping("/assignments/{assignmentId}/file")
    public ResponseEntity<byte[]> downloadAssignmentFile(
            Authentication auth,
            @PathVariable Long assignmentId) throws IOException {
        byte[] bytes = facultyPortalService.downloadAssignmentFile(auth.getName(), assignmentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
    }

    // ==================== Course Materials ====================

    @PostMapping("/materials")
    public ResponseEntity<CourseMaterialResponse> createCourseMaterial(
            Authentication auth,
            @Valid @RequestBody CreateCourseMaterialRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(facultyPortalService.createCourseMaterial(auth.getName(), request));
    }

    @GetMapping("/materials/{sectionId}")
    public ResponseEntity<List<CourseMaterialResponse>> getCourseMaterials(
            Authentication auth,
            @PathVariable Long sectionId) {
        return ResponseEntity.ok(facultyPortalService.getCourseMaterials(auth.getName(), sectionId));
    }

    /** Phase 8: Upload a file to an existing course material (multipart) */
    @PostMapping(value = "/materials/{materialId}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CourseMaterialResponse> uploadMaterialFile(
            Authentication auth,
            @PathVariable Long materialId,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(
                facultyPortalService.uploadMaterialFile(auth.getName(), materialId, file));
    }

    /** Phase 8: Download the file for a course material */
    @GetMapping("/materials/{materialId}/file")
    public ResponseEntity<byte[]> downloadMaterialFile(
            Authentication auth,
            @PathVariable Long materialId) throws IOException {
        byte[] bytes = facultyPortalService.downloadMaterialFile(auth.getName(), materialId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
    }

    // ==================== Question Papers ====================

    @PostMapping("/question-papers")
    public ResponseEntity<QuestionPaperResponse> uploadQuestionPaper(
            Authentication auth,
            @Valid @RequestBody CreateQuestionPaperRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(facultyPortalService.uploadQuestionPaper(auth.getName(), request));
    }

    @GetMapping("/question-papers")
    public ResponseEntity<List<QuestionPaperResponse>> getMyQuestionPapers(Authentication auth) {
        return ResponseEntity.ok(facultyPortalService.getMyQuestionPapers(auth.getName()));
    }

    // ==================== Notices ====================

    @PostMapping("/notices")
    public ResponseEntity<Map<String, Object>> draftNotice(
            Authentication auth,
            @Valid @RequestBody CreateNoticeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(facultyPortalService.draftNotice(auth.getName(), request));
    }

    // ==================== Analytics ====================

    @GetMapping("/analytics/{sectionId}")
    public ResponseEntity<FacultyAnalyticsResponse> getAnalytics(
            Authentication auth,
            @PathVariable Long sectionId) {
        return ResponseEntity.ok(facultyPortalService.getAnalytics(auth.getName(), sectionId));
    }
}
