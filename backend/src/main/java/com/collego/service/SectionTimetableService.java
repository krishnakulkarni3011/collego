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
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SectionTimetableService {

    private final SectionTimetableRepository timetableRepository;
    private final SectionRepository sectionRepository;

    @Value("${collego.storage.timetables:${user.home}/collego-storage/timetables}")
    private String storageBasePath;

    /** Upload (or replace) the timetable PDF for a section. Only one allowed per section. */
    @Transactional
    public Map<String, Object> uploadTimetable(Long sectionId, MultipartFile file) throws IOException {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionId));

        validatePdf(file);

        // Delete old file from disk if replacing
        timetableRepository.findBySectionId(sectionId).ifPresent(old -> {
            try {
                Files.deleteIfExists(Paths.get(storageBasePath, old.getFilePath()));
            } catch (IOException e) {
                log.warn("Could not delete old timetable file: {}", old.getFilePath());
            }
            timetableRepository.delete(old);
        });

        // Store new file
        String uniqueName = UUID.randomUUID() + "_" + sanitize(file.getOriginalFilename());
        String relativePath = "section/" + sectionId + "/" + uniqueName;
        Path target = Paths.get(storageBasePath, relativePath);
        Files.createDirectories(target.getParent());
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        SectionTimetable record = SectionTimetable.builder()
                .section(section)
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : uniqueName)
                .filePath(relativePath)
                .build();
        timetableRepository.save(record);

        log.info("Timetable uploaded for section {}: {}", sectionId, relativePath);
        return toMeta(record);
    }

    /** Returns the timetable metadata (fileName, uploadedAt) for a section, or null. */
    public Map<String, Object> getTimetableMeta(Long sectionId) {
        return timetableRepository.findBySectionId(sectionId)
                .map(this::toMeta)
                .orElse(null);
    }

    /** Serve the raw PDF bytes. */
    public byte[] downloadTimetable(Long sectionId) throws IOException {
        SectionTimetable record = timetableRepository.findBySectionId(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("No timetable found for section: " + sectionId));

        Path filePath = Paths.get(storageBasePath, record.getFilePath());
        if (!Files.exists(filePath)) {
            throw new ResourceNotFoundException("Timetable file missing on disk for section: " + sectionId);
        }
        return Files.readAllBytes(filePath);
    }

    /** Delete the timetable for a section. */
    @Transactional
    public void deleteTimetable(Long sectionId) {
        SectionTimetable record = timetableRepository.findBySectionId(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("No timetable found for section: " + sectionId));

        try {
            Files.deleteIfExists(Paths.get(storageBasePath, record.getFilePath()));
        } catch (IOException e) {
            log.warn("Could not delete timetable file from disk: {}", record.getFilePath());
        }
        timetableRepository.delete(record);
    }

    private Map<String, Object> toMeta(SectionTimetable t) {
        return Map.of(
                "sectionId",  t.getSection().getId(),
                "fileName",   t.getFileName(),
                "uploadedAt", t.getUploadedAt().toString()
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
