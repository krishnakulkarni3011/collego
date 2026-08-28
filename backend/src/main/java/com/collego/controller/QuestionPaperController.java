package com.collego.controller;

import com.collego.dto.QuestionPaperResponse;
import com.collego.service.QuestionPaperService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * Phase 6 — Question Paper Repository Controller.
 *
 * Endpoint summary:
 *   GET  /api/question-papers                    — Search/filter published papers (Student, Faculty, Admin)
 *   GET  /api/question-papers/popular            — Top downloaded papers
 *   GET  /api/question-papers/{id}               — Get paper metadata by id
 *   GET  /api/question-papers/{id}/download      — Download file (increments download count)
 *   POST /api/question-papers/{id}/upload        — Faculty: attach actual file to an existing QP record
 */
@RestController
@RequestMapping("/api/question-papers")
@RequiredArgsConstructor
public class QuestionPaperController {

    private final QuestionPaperService questionPaperService;

    // ==================== Search & Browse ====================

    /**
     * Search/filter approved question papers.
     * All query params are optional — omit any to skip that filter.
     *
     * Example:
     *   GET /api/question-papers?departmentId=1&semesterNumber=4&examType=END_TERM&year=2024
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<QuestionPaperResponse>> search(
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Integer semesterNumber,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String examType) {
        return ResponseEntity.ok(
                questionPaperService.search(courseId, departmentId, semesterNumber, year, examType));
    }

    /**
     * Get top-downloaded (most popular) approved question papers.
     */
    @GetMapping("/popular")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<QuestionPaperResponse>> getPopular() {
        return ResponseEntity.ok(questionPaperService.getPopular());
    }

    /**
     * Get metadata for a single approved question paper by id.
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<QuestionPaperResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(questionPaperService.getById(id));
    }

    // ==================== Download ====================

    /**
     * Download the file for an approved question paper.
     * Only APPROVED papers are accessible; download count is incremented atomically.
     */
    @GetMapping("/{id}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> download(@PathVariable Long id) throws IOException {
        QuestionPaperResponse meta = questionPaperService.getById(id);
        byte[] fileBytes = questionPaperService.downloadFile(id);

        String filename = meta.getFileName() != null ? meta.getFileName() : "question_paper_" + id + ".pdf";
        MediaType contentType = filename.toLowerCase().endsWith(".pdf")
                ? MediaType.APPLICATION_PDF
                : MediaType.APPLICATION_OCTET_STREAM;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(contentType)
                .body(fileBytes);
    }

    // ==================== Faculty: Attach File to Existing QP ====================

    /**
     * Faculty: Upload the actual file for a previously-created QuestionPaper record.
     * This separates metadata creation (done via POST /api/faculty/question-papers)
     * from file attachment, which requires multipart/form-data.
     *
     * The QP must have been created by the requesting faculty member.
     */
    @PostMapping("/{id}/upload")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<QuestionPaperResponse> uploadFile(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(questionPaperService.uploadFileForQp(id, file));
    }
}
