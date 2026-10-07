package com.collego.controller;

import com.collego.dto.*;
import com.collego.repository.AuditLogRepository;
import com.collego.service.AdminPortalService;
import com.collego.service.DepartmentService;
import com.collego.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;
    private final DepartmentService departmentService;
    private final AuditLogRepository auditLogRepository;
    private final AdminPortalService adminPortalService;

    // ==================== User Management (Phase 1) ====================

    @PostMapping("/users")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request,
                                                    Authentication auth,
                                                    HttpServletRequest httpRequest) {
        String adminEmail = auth.getName();
        String ipAddress = httpRequest.getRemoteAddr();
        UserResponse response = userService.createUser(request, adminEmail, ipAddress);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> listUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean active) {
        List<UserResponse> users = userService.getAllUsers();

        // Filter by role if specified
        if (role != null && !role.isEmpty()) {
            users = users.stream()
                    .filter(u -> u.getRole().equalsIgnoreCase(role))
                    .collect(Collectors.toList());
        }

        // Filter by active status if specified
        if (active != null) {
            users = users.stream()
                    .filter(u -> u.isActive() == active)
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(users);
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id,
                                                    @RequestBody UpdateUserRequest request,
                                                    Authentication auth,
                                                    HttpServletRequest httpRequest) {
        UserResponse response = adminPortalService.updateUser(id, request, auth.getName(), httpRequest.getRemoteAddr());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/users/{id}/deactivate")
    public ResponseEntity<UserResponse> deactivateUser(@PathVariable Long id,
                                                        Authentication auth,
                                                        HttpServletRequest httpRequest) {
        String adminEmail = auth.getName();
        String ipAddress = httpRequest.getRemoteAddr();
        UserResponse response = userService.deactivateUser(id, adminEmail, ipAddress);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/users/{id}/activate")
    public ResponseEntity<UserResponse> activateUser(@PathVariable Long id,
                                                      Authentication auth,
                                                      HttpServletRequest httpRequest) {
        String adminEmail = auth.getName();
        String ipAddress = httpRequest.getRemoteAddr();
        UserResponse response = userService.activateUser(id, adminEmail, ipAddress);
        return ResponseEntity.ok(response);
    }

    // ==================== Bulk Import (Phase 5) ====================

    @PostMapping("/users/import")
    public ResponseEntity<BulkImportResponse> bulkImportUsers(
            @RequestParam("file") MultipartFile file,
            Authentication auth,
            HttpServletRequest httpRequest) {
        BulkImportResponse response = adminPortalService.bulkImportUsers(
                file, auth.getName(), httpRequest.getRemoteAddr());
        return ResponseEntity.ok(response);
    }

    // ==================== Audit Logs ====================

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLogResponse>> getAuditLogs() {
        List<AuditLogResponse> logs = auditLogRepository.findAllByOrderByTimestampDesc()
                .stream()
                .map(log -> AuditLogResponse.builder()
                        .id(log.getId())
                        .userId(log.getUserId())
                        .userEmail(log.getUserEmail())
                        .action(log.getAction())
                        .entityType(log.getEntityType())
                        .entityId(log.getEntityId())
                        .details(log.getDetails())
                        .ipAddress(log.getIpAddress())
                        .timestamp(log.getTimestamp() != null ? log.getTimestamp() : java.time.LocalDateTime.now())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(logs);
    }

    // ==================== Departments ====================

    @PostMapping("/departments")
    public ResponseEntity<DepartmentResponse> createDepartment(@Valid @RequestBody CreateDepartmentRequest request) {
        DepartmentResponse response = departmentService.createDepartment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ==================== System Overview (Phase 5) ====================

    @GetMapping("/overview")
    public ResponseEntity<SystemOverviewResponse> getSystemOverview() {
        return ResponseEntity.ok(adminPortalService.getSystemOverview());
    }

    // ==================== Reports (Phase 5) ====================

    @GetMapping("/reports/departments")
    public ResponseEntity<List<DepartmentReportResponse>> getDepartmentReports() {
        return ResponseEntity.ok(adminPortalService.getDepartmentReports());
    }

    @GetMapping("/reports/subjects")
    public ResponseEntity<List<SubjectReportResponse>> getSubjectReports(
            @RequestParam(required = false) Long departmentId) {
        return ResponseEntity.ok(adminPortalService.getSubjectReports(departmentId));
    }

    @GetMapping("/reports/backlogs")
    public ResponseEntity<BacklogReportResponse> getBacklogReport(
            @RequestParam(required = false) Long departmentId) {
        return ResponseEntity.ok(adminPortalService.getBacklogReport(departmentId));
    }

    @GetMapping("/reports/attendance")
    public ResponseEntity<List<AttendanceSummaryResponse>> getAttendanceSummary() {
        return ResponseEntity.ok(adminPortalService.getAttendanceSummary());
    }

    // ==================== Question Paper Approval (Phase 5) ====================

    @GetMapping("/question-papers")
    public ResponseEntity<List<QuestionPaperResponse>> getAllQuestionPapers() {
        return ResponseEntity.ok(adminPortalService.getAllQuestionPapers());
    }

    @GetMapping("/question-papers/pending")
    public ResponseEntity<List<QuestionPaperResponse>> getPendingQuestionPapers() {
        return ResponseEntity.ok(adminPortalService.getPendingQuestionPapers());
    }

    @PutMapping("/question-papers/{id}/approve")
    public ResponseEntity<QuestionPaperResponse> approveQuestionPaper(
            @PathVariable Long id,
            Authentication auth,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(adminPortalService.approveQuestionPaper(
                id, auth.getName(), httpRequest.getRemoteAddr()));
    }

    @PutMapping("/question-papers/{id}/reject")
    public ResponseEntity<QuestionPaperResponse> rejectQuestionPaper(
            @PathVariable Long id,
            Authentication auth,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(adminPortalService.rejectQuestionPaper(
                id, auth.getName(), httpRequest.getRemoteAddr()));
    }

    // ==================== Backup (Phase 5 — Stub) ====================

    @PostMapping("/backup")
    public ResponseEntity<Map<String, Object>> triggerBackup(
            Authentication auth,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(adminPortalService.triggerBackup(
                auth.getName(), httpRequest.getRemoteAddr()));
    }
}
