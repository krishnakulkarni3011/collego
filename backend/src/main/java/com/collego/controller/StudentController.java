package com.collego.controller;

import com.collego.dto.*;
import com.collego.service.MarksheetService;
import com.collego.service.StudentPortalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasRole('STUDENT')")
@RequiredArgsConstructor
public class StudentController {

    private final StudentPortalService studentPortalService;
    private final MarksheetService marksheetService;

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
}
