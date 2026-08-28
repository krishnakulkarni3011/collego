package com.collego.controller;

import com.collego.dto.*;
import com.collego.service.PlacementService;
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

/**
 * Phase 7 — Placement Management Controller.
 *
 * Base path: /api/placement
 *
 * Admin endpoints:
 *   POST   /api/placement/companies                       — Register company
 *   GET    /api/placement/companies                       — List all companies
 *   GET    /api/placement/companies/{id}                  — Get company by id
 *   PUT    /api/placement/companies/{id}                  — Update company
 *   DELETE /api/placement/companies/{id}/deactivate       — Deactivate company
 *
 *   POST   /api/placement/job-postings                    — Create job posting
 *   GET    /api/placement/job-postings                    — List all postings (admin view)
 *   GET    /api/placement/job-postings/{id}               — Get posting detail
 *   PUT    /api/placement/job-postings/{id}/status        — Update posting status
 *
 *   GET    /api/placement/job-postings/{id}/applications  — All applications for a posting
 *   PUT    /api/placement/applications/{id}/status        — Update application status
 *
 *   POST   /api/placement/interviews                      — Schedule interview
 *   GET    /api/placement/job-postings/{id}/interviews    — Interviews for a posting
 *   PUT    /api/placement/interviews/{id}/outcome         — Record interview outcome
 *
 *   GET    /api/placement/stats                           — Placement statistics
 *   GET    /api/placement/resumes/{id}/download           — Download a student's resume
 *
 * Student endpoints:
 *   GET    /api/placement/jobs                            — Browse eligible job postings
 *   POST   /api/placement/apply                           — Apply for a job
 *   POST   /api/placement/applications/{id}/withdraw      — Withdraw application
 *   GET    /api/placement/my-applications                 — My applications
 *   GET    /api/placement/my-interviews                   — My interview schedule
 *
 *   POST   /api/placement/resumes                         — Upload resume
 *   GET    /api/placement/resumes                         — My resumes
 *   PUT    /api/placement/resumes/{id}/set-active         — Set active resume
 *   GET    /api/placement/resumes/{id}/download           — Download own resume
 */
@RestController
@RequestMapping("/api/placement")
@RequiredArgsConstructor
public class PlacementController {

    private final PlacementService placementService;

    // ==================== Companies (Admin) ====================

    @PostMapping("/companies")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CompanyResponse> createCompany(
            @Valid @RequestBody CreateCompanyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(placementService.createCompany(request));
    }

    @GetMapping("/companies")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CompanyResponse>> getCompanies(
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(activeOnly
                ? placementService.getActiveCompanies()
                : placementService.getAllCompanies());
    }

    @GetMapping("/companies/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CompanyResponse> getCompanyById(@PathVariable Long id) {
        return ResponseEntity.ok(placementService.getCompanyById(id));
    }

    @PutMapping("/companies/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CompanyResponse> updateCompany(
            @PathVariable Long id, @RequestBody CreateCompanyRequest request) {
        return ResponseEntity.ok(placementService.updateCompany(id, request));
    }

    @PutMapping("/companies/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deactivateCompany(@PathVariable Long id) {
        placementService.deactivateCompany(id);
        return ResponseEntity.ok(Map.of("message", "Company deactivated successfully."));
    }

    // ==================== Job Postings (Admin) ====================

    @PostMapping("/job-postings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> createJobPosting(
            @Valid @RequestBody CreateJobPostingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(placementService.createJobPosting(request));
    }

    @GetMapping("/job-postings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<JobPostingResponse>> getAllJobPostings() {
        return ResponseEntity.ok(placementService.getAllJobPostings());
    }

    @GetMapping("/job-postings/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<JobPostingResponse> getJobPostingById(@PathVariable Long id) {
        return ResponseEntity.ok(placementService.getJobPostingById(id));
    }

    @PutMapping("/job-postings/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> updateJobPostingStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(placementService.updateJobPostingStatus(id, status));
    }

    // ==================== Applications (Admin) ====================

    @GetMapping("/job-postings/{id}/applications")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ApplicationResponse>> getApplicationsForPosting(
            @PathVariable Long id,
            @RequestParam(required = false) String status) {
        if (status != null) {
            return ResponseEntity.ok(placementService.getApplicationsForPosting(id, status));
        }
        return ResponseEntity.ok(placementService.getApplicationsForPosting(id));
    }

    @PutMapping("/applications/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApplicationResponse> updateApplicationStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(placementService.updateApplicationStatus(id, status, notes));
    }

    // ==================== Interview Schedule (Admin) ====================

    @PostMapping("/interviews")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InterviewScheduleResponse> scheduleInterview(
            @Valid @RequestBody CreateInterviewScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(placementService.scheduleInterview(request));
    }

    @GetMapping("/job-postings/{id}/interviews")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<InterviewScheduleResponse>> getInterviewsForPosting(@PathVariable Long id) {
        return ResponseEntity.ok(placementService.getInterviewsForPosting(id));
    }

    @PutMapping("/interviews/{id}/outcome")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InterviewScheduleResponse> updateInterviewOutcome(
            @PathVariable Long id,
            @RequestParam String outcome,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(placementService.updateInterviewOutcome(id, outcome, notes));
    }

    // ==================== Placement Statistics (Admin) ====================

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PlacementStatsResponse> getPlacementStats() {
        return ResponseEntity.ok(placementService.getPlacementStats());
    }

    // ==================== Student: Browse Jobs ====================

    @GetMapping("/jobs")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<JobPostingResponse>> getJobsForStudent(Authentication auth) {
        return ResponseEntity.ok(placementService.getJobPostingsForStudent(auth.getName()));
    }

    // ==================== Student: Apply & Manage ====================

    @PostMapping("/apply")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApplicationResponse> applyForJob(
            Authentication auth,
            @Valid @RequestBody ApplyJobRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(placementService.applyForJob(auth.getName(), request));
    }

    @PostMapping("/applications/{id}/withdraw")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApplicationResponse> withdrawApplication(
            Authentication auth,
            @PathVariable Long id) {
        return ResponseEntity.ok(placementService.withdrawApplication(auth.getName(), id));
    }

    @GetMapping("/my-applications")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<ApplicationResponse>> getMyApplications(Authentication auth) {
        return ResponseEntity.ok(placementService.getMyApplications(auth.getName()));
    }

    @GetMapping("/my-interviews")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<InterviewScheduleResponse>> getMyInterviews(Authentication auth) {
        return ResponseEntity.ok(placementService.getMyInterviews(auth.getName()));
    }

    // ==================== Resume Management (Student) ====================

    @PostMapping("/resumes")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ResumeResponse> uploadResume(
            Authentication auth,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String versionLabel,
            @RequestParam(defaultValue = "true") boolean setActive) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(placementService.uploadResume(auth.getName(), file, versionLabel, setActive));
    }

    @GetMapping("/resumes")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<ResumeResponse>> getMyResumes(Authentication auth) {
        return ResponseEntity.ok(placementService.getMyResumes(auth.getName()));
    }

    @PutMapping("/resumes/{id}/set-active")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ResumeResponse> setActiveResume(
            Authentication auth, @PathVariable Long id) {
        return ResponseEntity.ok(placementService.setActiveResume(auth.getName(), id));
    }

    @GetMapping("/resumes/{id}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> downloadResume(
            Authentication auth,
            @PathVariable Long id) throws IOException {

        byte[] bytes;
        String filename;

        // Admin can download any resume; student can only download their own
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isAdmin) {
            bytes = placementService.downloadResumeByAdmin(id);
            filename = "resume_" + id + ".pdf";
        } else {
            bytes = placementService.downloadResume(auth.getName(), id);
            filename = "my_resume_" + id + ".pdf";
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(bytes);
    }
}
