package com.collego.service;

import com.collego.entity.Section;
import com.collego.entity.SectionTimetable;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.SectionRepository;
import com.collego.repository.SectionTimetableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SectionTimetableService {

    private final SectionTimetableRepository timetableRepository;
    private final SectionRepository sectionRepository;
    private final S3StorageService s3StorageService;

    @Value("${collego.aws.s3-bucket-timetables:collego-timetables-prod}")
    private String timetableBucket;

    /**
     * Upload (or replace) the timetable PDF for a section. Only one allowed per section.
     * Stores the file in S3 (collego.aws.use-s3=true in prod).
     */
    @Transactional
    public Map<String, Object> uploadTimetable(Long sectionId, MultipartFile file) throws IOException {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionId));

        validatePdf(file);

        // Delete old file from S3 if replacing
        timetableRepository.findBySectionId(sectionId).ifPresent(old -> {
            try {
                if (old.getFilePath() != null) {
                    s3StorageService.delete(timetableBucket, old.getFilePath());
                }
            } catch (Exception e) {
                log.warn("Could not delete old timetable file from S3: {}", old.getFilePath(), e);
            }
            timetableRepository.delete(old);
        });

        // Store new file in S3
        String uniqueName = UUID.randomUUID() + "_" + sanitize(file.getOriginalFilename());
        String s3Key = "timetables/section/" + sectionId + "/" + uniqueName;
        String contentType = S3StorageService.detectContentType(file.getOriginalFilename());

        s3StorageService.upload(timetableBucket, s3Key, file.getInputStream(),
                file.getSize(), contentType);

        SectionTimetable record = SectionTimetable.builder()
                .section(section)
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : uniqueName)
                .filePath(s3Key)
                .build();
        timetableRepository.save(record);

        log.info("Timetable uploaded for section {} to s3://{}/{}", sectionId, timetableBucket, s3Key);
        return toMeta(record);
    }

    /** Returns the timetable metadata (fileName, uploadedAt) for a section, or null. */
    public Map<String, Object> getTimetableMeta(Long sectionId) {
        return timetableRepository.findBySectionId(sectionId)
                .map(this::toMeta)
                .orElse(null);
    }

    /** Serve the raw PDF bytes from S3. */
    public byte[] downloadTimetable(Long sectionId) throws IOException {
        SectionTimetable record = timetableRepository.findBySectionId(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("No timetable found for section: " + sectionId));

        if (record.getFilePath() == null) {
            throw new ResourceNotFoundException("Timetable file path missing for section: " + sectionId);
        }

        // Download from S3
        return s3StorageService.download(timetableBucket, record.getFilePath());
    }

    /** Delete the timetable for a section (file from S3 + DB record). */
    @Transactional
    public void deleteTimetable(Long sectionId) {
        SectionTimetable record = timetableRepository.findBySectionId(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("No timetable found for section: " + sectionId));

        try {
            if (record.getFilePath() != null) {
                s3StorageService.delete(timetableBucket, record.getFilePath());
            }
        } catch (Exception e) {
            log.warn("Could not delete timetable file from S3: {}", record.getFilePath(), e);
        }
        timetableRepository.delete(record);
    }

    private Map<String, Object> toMeta(SectionTimetable t) {
        return Map.of(
                "sectionId", t.getSection().getId(),
                "fileName", t.getFileName(),
                "uploadedAt", t.getUploadedAt().toString(),
                "s3Key", t.getFilePath()
        );
    }

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File must not be empty.");
        }
        String name = file.getOriginalFilename();
        if (name == null || !name.toLowerCase().endsWith(".pdf")) {
            throw new BadRequestException("Only PDF files are allowed.");
        }
    }

    private String sanitize(String name) {
        if (name == null) return "timetable.pdf";
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
