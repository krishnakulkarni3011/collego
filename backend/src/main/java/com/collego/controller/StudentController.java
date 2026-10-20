package com.collego.controller;

import com.collego.dto.*;
import com.collego.service.FeePaymentService;
import com.collego.service.MarksheetService;
import com.collego.service.StudentPortalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
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
@RequestMapping("/api/student")
@PreAuthorize("hasRole('STUDENT')")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class StudentController {

    private final StudentPortalService studentPortalService;
    private final MarksheetService marksheetService;
    private final FeePaymentService feePaymentService;

    @GetMapping("/profile")
    public ResponseEntity<StudentProfileResponse> getProfile(Authentication auth) {
        return ResponseEntity.ok(studentPortalService.getProfile(auth.getName()));
    }

    @GetMapping("/attendance")
    public ResponseEntity<List<SubjectAttendanceResponse>> getAttendance(
            Authentication auth,
            @RequestParam(required = false) Long semesterId) {
        return ResponseEntity.ok(studentPortalService.getAttendance(auth.getName(), semesterId));
    }

    @GetMapping("/attendance/overall")
    public ResponseEntity<OverallAttendanceResponse> getOverallAttendance(Authentication auth) {
        return ResponseEntity.ok(studentPortalService.getOverallAttendance(auth.getName()));
    }

    @GetMapping("/marks/internal")
    public ResponseEntity<List<InternalMarksResponse>> getInternalMarks(
            Authentication auth,
            @RequestParam(required = false) Long semesterId) {
        return ResponseEntity.ok(studentPortalService.getInternalMarks(auth.getName(), semesterId));
    }

    @GetMapping("/marks/semester/{semesterId}")
    public ResponseEntity<List<SemesterMarksResponse>> getSemesterMarks(
            Authentication auth,
            @PathVariable Long semesterId) {
        return ResponseEntity.ok(studentPortalService.getSemesterMarks(auth.getName(), semesterId));
    }

    @GetMapping("/cgpa")
    public ResponseEntity<CgpaResponse> getCgpa(Authentication auth) {
        return ResponseEntity.ok(studentPortalService.calculateCgpa(auth.getName()));
    }

    @GetMapping("/timetable")
    public ResponseEntity<StudentTimetableResponse> getTimetable(Authentication auth) {
        return ResponseEntity.ok(studentPortalService.getTimetable(auth.getName()));
    }

    @GetMapping("/fees")
    public ResponseEntity<List<FeeResponse>> getFees(Authentication auth) {
        return ResponseEntity.ok(studentPortalService.getFees(auth.getName()));
    }

    @GetMapping("/fees/payment-config")
    public ResponseEntity<Map<String, Object>> paymentConfig() {
        return ResponseEntity.ok(feePaymentService.paymentConfig());
    }

    @PostMapping("/fees/{feeId}/pay")
    public ResponseEntity<FeePaymentResponse> payFee(
            Authentication auth,
            @PathVariable Long feeId,
            @jakarta.validation.Valid @RequestBody RecordPaymentRequest request) {
        return ResponseEntity.ok(feePaymentService.payAsStudent(auth.getName(), feeId, request));
    }

    @GetMapping("/fees/payments/{paymentId}/receipt")
    public ResponseEntity<byte[]> downloadReceipt(
            Authentication auth,
            @PathVariable Long paymentId) {
        byte[] pdf = feePaymentService.receipt(auth.getName(), paymentId, false);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=receipt-" + paymentId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/placements")
    public ResponseEntity<List<PlacementNoticeResponse>> getPlacementNotices(Authentication auth) {
        return ResponseEntity.ok(studentPortalService.getPlacementNotices(auth.getName()));
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<NotificationResponse>> getNotifications(Authentication auth) {
        return ResponseEntity.ok(studentPortalService.getNotifications(auth.getName()));
    }

    @GetMapping("/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication auth) {
        long count = studentPortalService.getUnreadNotificationCount(auth.getName());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<Map<String, String>> markNotificationRead(
            Authentication auth,
            @PathVariable Long id) {
        studentPortalService.markNotificationRead(auth.getName(), id);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @GetMapping("/marksheet/{semesterId}")
    public ResponseEntity<byte[]> downloadMarksheet(Authentication auth, @PathVariable Long semesterId) {
        byte[] pdf = marksheetService.generateMarksheet(auth.getName(), semesterId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=marksheet_sem" + semesterId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/transcript")
    public ResponseEntity<byte[]> downloadTranscript(Authentication auth) {
        byte[] pdf = marksheetService.generateTranscript(auth.getName());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=academic_transcript.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/academic-history")
    public ResponseEntity<CgpaResponse> getAcademicHistory(Authentication auth) {
        return ResponseEntity.ok(studentPortalService.getAcademicHistory(auth.getName()));
    }

    // ==================== Assignments ====================

    @GetMapping("/assignments")
    public ResponseEntity<List<AssignmentResponse>> getAssignments(Authentication auth) {
        return ResponseEntity.ok(studentPortalService.getAssignmentsForStudent(auth.getName()));
    }

    @GetMapping("/assignments/{assignmentId}/file")
    public ResponseEntity<byte[]> downloadAssignmentFile(
            Authentication auth,
            @PathVariable Long assignmentId) throws IOException {
        byte[] bytes = studentPortalService.downloadAssignmentFile(auth.getName(), assignmentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
    }

    // ==================== Course Materials ====================

    @GetMapping("/materials")
    public ResponseEntity<List<CourseMaterialResponse>> getMaterials(Authentication auth) {
        return ResponseEntity.ok(studentPortalService.getMaterialsForStudent(auth.getName()));
    }

    @GetMapping("/materials/{materialId}/file")
    public ResponseEntity<byte[]> downloadMaterialFile(
            Authentication auth,
            @PathVariable Long materialId) throws IOException {
        byte[] bytes = studentPortalService.downloadMaterialFile(auth.getName(), materialId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
    }

    // ==================== Assignment Submissions ====================

    @PostMapping(value = "/assignments/{assignmentId}/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AssignmentSubmissionResponse> submitAssignment(
            Authentication auth,
            @PathVariable Long assignmentId,
            @RequestParam(value = "note", required = false) String note,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(studentPortalService.submitAssignment(auth.getName(), assignmentId, note, file));
    }

    @GetMapping("/assignments/{assignmentId}/submission")
    public ResponseEntity<AssignmentSubmissionResponse> getMySubmission(
            Authentication auth,
            @PathVariable Long assignmentId) {
        return studentPortalService.getMySubmission(auth.getName(), assignmentId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/submissions/{submissionId}/file")
    public ResponseEntity<byte[]> downloadMySubmission(
            Authentication auth,
            @PathVariable Long submissionId) throws IOException {
        byte[] bytes = studentPortalService.downloadMySubmissionFile(auth.getName(), submissionId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
    }
}
