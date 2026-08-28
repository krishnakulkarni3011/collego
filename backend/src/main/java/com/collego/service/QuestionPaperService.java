package com.collego.service;

import com.collego.dto.QuestionPaperResponse;
import com.collego.entity.QuestionPaper;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.QuestionPaperRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Phase 6 — Question Paper Repository Service.
 *
 * Responsibilities:
 *  - Search/filter published (APPROVED) question papers
 *  - Handle actual file upload to local storage (S3-ready path structure)
 *  - Track download counts
 *  - Serve file bytes for download
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionPaperService {

    private final QuestionPaperRepository questionPaperRepository;

    @Value("${collego.storage.question-papers:${user.home}/collego-storage/question-papers}")
    private String storageBasePath;

    // ==================== Phase 6: Search ====================

    /**
     * Search/filter approved question papers.
     * All parameters are optional — null means "no filter on that field".
     */
    public List<QuestionPaperResponse> search(Long courseId, Long departmentId,
                                              Integer semesterNumber, Integer year,
                                              String examType) {
        List<QuestionPaper> papers = questionPaperRepository
                .searchApproved(courseId, departmentId, semesterNumber, year, examType);

        return papers.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * List most-downloaded approved papers (popularity ranking).
     */
    public List<QuestionPaperResponse> getPopular() {
        return questionPaperRepository.findTopByDownloads()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a single approved question paper's metadata by id.
     */
    public QuestionPaperResponse getById(Long id) {
        QuestionPaper qp = questionPaperRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question paper not found: " + id));
        if (!"APPROVED".equals(qp.getStatus())) {
            throw new ResourceNotFoundException("Question paper not found: " + id);
        }
        return mapToResponse(qp);
    }

    // ==================== Phase 6: File Upload ====================

    /**
     * Store the uploaded file on local disk under an organized path:
     *   <storageBasePath>/<deptId>/<semNumber>/<courseId>/<uuid>_<originalFilename>
     *
     * This mirrors the S3 key structure that will be used in Phase 8.
     * Returns the stored relative file path to be persisted in QuestionPaper.filePath.
     */
    @Transactional
    public String storeFile(MultipartFile file, Long qpId) throws IOException {
        QuestionPaper qp = questionPaperRepository.findById(qpId)
                .orElseThrow(() -> new ResourceNotFoundException("Question paper not found: " + qpId));

        validateFileType(file);

        String uniqueName = UUID.randomUUID() + "_" + sanitizeFilename(file.getOriginalFilename());
        String relativePath = buildRelativePath(qp, uniqueName);

        Path targetPath = Paths.get(storageBasePath, relativePath);
        Files.createDirectories(targetPath.getParent());
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        qp.setFilePath(relativePath);
        qp.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : uniqueName);
        questionPaperRepository.save(qp);

        log.info("Stored question paper file: {}", relativePath);
        return relativePath;
    }

    // ==================== Phase 6: Download ====================

    /**
     * Serve file bytes for download, incrementing the download counter.
     * Only APPROVED papers are downloadable.
     */
    @Transactional
    public byte[] downloadFile(Long qpId) throws IOException {
        QuestionPaper qp = questionPaperRepository.findById(qpId)
                .orElseThrow(() -> new ResourceNotFoundException("Question paper not found: " + qpId));

        if (!"APPROVED".equals(qp.getStatus())) {
            throw new BadRequestException("Question paper is not available for download (status: " + qp.getStatus() + ")");
        }

        if (qp.getFilePath() == null || qp.getFilePath().isBlank()) {
            throw new BadRequestException("No file has been attached to this question paper yet.");
        }

        Path filePath = Paths.get(storageBasePath, qp.getFilePath());
        if (!Files.exists(filePath)) {
            throw new ResourceNotFoundException("File not found on storage for question paper: " + qpId);
        }

        // Increment download count
        questionPaperRepository.incrementDownloadCount(qpId);

        log.info("Question paper {} downloaded (total downloads: {})", qpId, qp.getDownloadCount() + 1);
        return Files.readAllBytes(filePath);
    }

    // ==================== Phase 6: Upload file for Faculty (with QP metadata) ====================

    /**
     * Convenience method: Store file AND link it to a QP in one step.
     * Called after QP record is created via FacultyPortalService.
     */
    @Transactional
    public QuestionPaperResponse uploadFileForQp(Long qpId, MultipartFile file) throws IOException {
        storeFile(file, qpId);
        QuestionPaper qp = questionPaperRepository.findById(qpId).orElseThrow();
        return mapToResponse(qp);
    }

    // ==================== Helpers ====================

    private String buildRelativePath(QuestionPaper qp, String filename) {
        return qp.getDepartment().getId()
                + "/" + qp.getSemesterNumber()
                + "/" + qp.getCourse().getId()
                + "/" + filename;
    }

    private void validateFileType(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File must not be empty.");
        }
        String original = file.getOriginalFilename();
        if (original == null) return;
        String lower = original.toLowerCase();
        if (!lower.endsWith(".pdf") && !lower.endsWith(".docx") && !lower.endsWith(".doc")) {
            throw new BadRequestException("Only PDF and Word documents are allowed. Received: " + original);
        }
    }

    private String sanitizeFilename(String name) {
        if (name == null) return "file";
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    public QuestionPaperResponse mapToResponse(QuestionPaper qp) {
        String uploaderName = null;
        if (qp.getUploadedBy() != null) {
            uploaderName = qp.getUploadedBy().getFirstName() + " " + qp.getUploadedBy().getLastName();
        }
        return QuestionPaperResponse.builder()
                .id(qp.getId())
                .courseName(qp.getCourse().getName())
                .courseCode(qp.getCourse().getCode())
                .departmentName(qp.getDepartment().getName())
                .examType(qp.getExamType())
                .year(qp.getYear())
                .semesterNumber(qp.getSemesterNumber())
                .fileName(qp.getFileName())
                .filePath(qp.getFilePath())
                .status(qp.getStatus())
                .uploadedByName(uploaderName)
                .downloadCount(qp.getDownloadCount())
                .createdAt(qp.getCreatedAt())
                .build();
    }
}
