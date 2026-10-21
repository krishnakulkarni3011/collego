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
@SuppressWarnings("null")
public class FacultyController {

    private final FacultyPortalService facultyPortalService;

    // ==================== Sections ====================

    @GetMapping("/sections")
    public ResponseEntity<List<FacultySectionResponse>> getAssignedSections(Authentication auth) {
        return ResponseEntity.ok(facultyPortalService.getAssignedSections(auth.getName()));
    }

    // ==================== Faculty Subject Assignment ====================

    @GetMapping("/courses")
    public ResponseEntity<List<CourseResponse>> getAvailableCourses(Authentication auth) {
        return ResponseEntity.ok(facultyPortalService.getAvailableCoursesForDepartment(auth.getName()));
    }

    @GetMapping("/semesters")
    public ResponseEntity<List<SemesterResponse>> getAllSemesters(Authentication auth) {
        return ResponseEntity.ok(facultyPortalService.getAllSemesters());
    }

    @PostMapping("/subject-assignments")
    public ResponseEntity<FacultySubjectAssignmentResponse> assignSubjectToSelf(
            Authentication auth,
            @Valid @RequestBody AssignFacultySubjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(facultyPortalService.assignSubjectToSelf(auth.getName(), request));
    }

    @GetMapping("/subject-assignments")
    public ResponseEntity<List<FacultySubjectAssignmentResponse>> getMySubjectAssignments(Authentication auth) {
        return ResponseEntity.ok(facultyPortalService.getMySubjectAssignments(auth.getName()));
    }

    @DeleteMapping("/subject-assignments/{assignmentId}")
    public ResponseEntity<Map<String, String>> removeSubjectAssignment(
            Authentication auth,
            @PathVariable Long assignmentId) {
        facultyPortalService.removeSubjectAssignment(auth.getName(), assignmentId);
        return ResponseEntity.ok(Map.of("message", "Subject assignment removed successfully"));
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

    @GetMapping("/marks/semester/{sectionId}")
    public ResponseEntity<List<Map<String, Object>>> getSemesterMarksForSection(
            Authentication auth,
            @PathVariable Long sectionId) {
        return ResponseEntity.ok(facultyPortalService.getSemesterMarksForSection(auth.getName(), sectionId));
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

    // ==================== Assignment Submissions / Grading ====================

    @GetMapping("/assignments/{assignmentId}/submissions")
    public ResponseEntity<List<AssignmentSubmissionResponse>> getSubmissions(
            Authentication auth,
            @PathVariable Long assignmentId) {
        return ResponseEntity.ok(facultyPortalService.getSubmissions(auth.getName(), assignmentId));
    }

    @GetMapping("/submissions/{submissionId}/file")
    public ResponseEntity<byte[]> downloadSubmissionFile(
            Authentication auth,
            @PathVariable Long submissionId) throws IOException {
        byte[] bytes = facultyPortalService.downloadSubmissionFile(auth.getName(), submissionId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
    }

    @PutMapping("/submissions/{submissionId}/grade")
    public ResponseEntity<AssignmentSubmissionResponse> gradeSubmission(
            Authentication auth,
            @PathVariable Long submissionId,
            @Valid @RequestBody GradeSubmissionRequest request) {
        return ResponseEntity.ok(facultyPortalService.gradeSubmission(auth.getName(), submissionId, request));
    }

    // ==================== Assignment Marks ====================

    @GetMapping("/assignment-marks/{sectionId}")
    public ResponseEntity<List<Map<String, Object>>> getAssignmentMarksForSection(
            Authentication auth,
            @PathVariable Long sectionId) {
        return ResponseEntity.ok(facultyPortalService.getAssignmentMarksForSection(auth.getName(), sectionId));
    }

    @GetMapping("/assignments/{assignmentId}/marks")
    public ResponseEntity<Map<String, Object>> getAssignmentMarksGrid(
            Authentication auth,
            @PathVariable Long assignmentId) {
        return ResponseEntity.ok(facultyPortalService.getAssignmentMarksGrid(auth.getName(), assignmentId));
    }

    @PostMapping("/assignments/{assignmentId}/marks")
    public ResponseEntity<Map<String, Object>> uploadAssignmentMarks(
            Authentication auth,
            @PathVariable Long assignmentId,
            @Valid @RequestBody UploadAssignmentMarksRequest request) {
        return ResponseEntity.ok(facultyPortalService.uploadAssignmentMarks(auth.getName(), assignmentId, request));
    }

    // ==================== Course Materials ====================

    @PostMapping("/materials")
    public ResponseEntity<CourseMaterialResponse> createCourseMaterial(
            Authentication auth,
            @Valid @RequestBody CreateCourseMaterialRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(facultyPortalService.createCourseMaterial(auth.getName(), request));
    }

    @PostMapping(value = "/materials/with-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CourseMaterialResponse> createCourseMaterialWithFile(
            Authentication auth,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("materialType") String materialType,
            @RequestParam("sectionId") Long sectionId,
            @RequestParam("targetYear") Integer targetYear,
            @RequestParam(value = "file", required = false) MultipartFile file) throws IOException {

        CreateCourseMaterialRequest request = CreateCourseMaterialRequest.builder()
                .title(title)
                .description(description)
                .materialType(materialType)
                .sectionId(sectionId)
                .targetYear(targetYear)
                .fileName(file != null ? file.getOriginalFilename() : null)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(facultyPortalService.createCourseMaterialWithFile(auth.getName(), request, file));
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

    @PostMapping(value = "/question-papers/with-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<QuestionPaperResponse> uploadQuestionPaperWithFile(
            Authentication auth,
            @RequestParam("courseId") Long courseId,
            @RequestParam(value = "departmentId", required = false) Long departmentId,
            @RequestParam("examType") String examType,
            @RequestParam("year") Integer year,
            @RequestParam("semesterNumber") Integer semesterNumber,
            @RequestParam("targetYear") Integer targetYear,
            @RequestParam(value = "fileName", required = false) String fileName,
            @RequestParam(value = "file", required = false) MultipartFile file) throws IOException {

        CreateQuestionPaperRequest request = CreateQuestionPaperRequest.builder()
                .courseId(courseId)
                .departmentId(departmentId)
                .examType(examType)
                .year(year)
                .semesterNumber(semesterNumber)
                .targetYear(targetYear)
                .fileName(fileName != null ? fileName : (file != null ? file.getOriginalFilename() : null))
                .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(facultyPortalService.uploadQuestionPaperWithFile(auth.getName(), request, file));
    }

    @GetMapping("/question-papers")
    public ResponseEntity<List<QuestionPaperResponse>> getMyQuestionPapers(Authentication auth) {
        return ResponseEntity.ok(facultyPortalService.getMyQuestionPapers(auth.getName()));
    }

    @GetMapping("/question-papers/{questionPaperId}/file")
    public ResponseEntity<byte[]> downloadQuestionPaperFile(
            Authentication auth,
            @PathVariable Long questionPaperId) throws IOException {
        byte[] bytes = facultyPortalService.downloadQuestionPaperFile(auth.getName(), questionPaperId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
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