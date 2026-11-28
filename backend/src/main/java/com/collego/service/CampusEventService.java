package com.collego.service;

import com.collego.dto.CampusEventResponse;
import com.collego.dto.UnifiedEventResponse;
import com.collego.entity.CampusEvent;
import com.collego.entity.PlacementNotice;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.CampusEventRepository;
import com.collego.repository.PlacementNoticeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

/** Campus events published by Admin and displayed on all dashboards. */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class CampusEventService {

    private final CampusEventRepository eventRepository;
    private final PlacementNoticeRepository placementNoticeRepository;
    private final S3StorageService s3StorageService;

    @Value("${collego.aws.s3-bucket-materials:collego-materials-prod}")
    private String bucket;

    @Transactional
    public CampusEventResponse publish(String adminEmail, String title, String description,
                                       String eventDate, MultipartFile poster) throws IOException {
        String name = title == null ? "" : title.trim();
        if (name.isEmpty()) {
            throw new BadRequestException("Event title is required");
        }
        if (poster == null || poster.isEmpty()) {
            throw new BadRequestException("Choose a poster image (JPG or PNG)");
        }
        if (poster.getSize() > 5L * 1024 * 1024) {
            throw new BadRequestException("Poster must be 5 MB or smaller");
        }
        String originalName = poster.getOriginalFilename() != null ? poster.getOriginalFilename() : "poster.png";
        String lower = originalName.toLowerCase(Locale.ROOT);
        if (!(lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png"))) {
            throw new BadRequestException("Upload a JPG or PNG poster image.");
        }

        LocalDate date = null;
        if (eventDate != null && !eventDate.isBlank()) {
            try {
                date = LocalDate.parse(eventDate.trim());
            } catch (Exception ex) {
                throw new BadRequestException("Event date must be in YYYY-MM-DD format");
            }
        }

        CampusEvent event = eventRepository.save(CampusEvent.builder()
                .title(name)
                .description(description == null ? null : description.trim())
                .eventDate(date)
                .posterName(originalName)
                .posterContentType(S3StorageService.detectContentType(originalName))
                .active(true)
                .createdBy(adminEmail)
                .build());

        String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String key = "events/" + event.getId() + "/" + UUID.randomUUID() + "_" + safeName;
        s3StorageService.upload(bucket, key, poster.getInputStream(), poster.getSize(),
                S3StorageService.detectContentType(originalName));
        event.setPosterPath(key);
        event = eventRepository.save(event);

        log.info("Admin {} published campus event '{}'", adminEmail, name);
        return map(event);
    }

    @Transactional(readOnly = true)
    public List<UnifiedEventResponse> listMerged() {
        LocalDate today = LocalDate.now();
        List<UnifiedEventResponse> merged = new ArrayList<>();

        for (CampusEvent event : eventRepository.findByActiveTrueOrderByEventDateAsc()) {
            if (event.getEventDate() != null && event.getEventDate().isBefore(today)) continue;
            merged.add(UnifiedEventResponse.builder()
                    .id("event-" + event.getId())
                    .source("Campus Event")
                    .title(event.getTitle())
                    .description(event.getDescription())
                    .date(event.getEventDate())
                    .posterUrl("/api/events/" + event.getId() + "/poster")
                    .build());
        }

        for (PlacementNotice notice : placementNoticeRepository.findByIsActiveTrueOrderByDriveDateAsc()) {
            LocalDate date = notice.getDriveDate() != null ? notice.getDriveDate() : notice.getLastDate();
            if (date == null || date.isBefore(today)) continue;
            merged.add(UnifiedEventResponse.builder()
                    .id("placement-" + notice.getId())
                    .source("Placement Drive")
                    .title(notice.getTitle())
                    .description(notice.getCompanyName()
                            + (notice.getPackageOffered() != null ? " - " + notice.getPackageOffered() : ""))
                    .date(date)
                    .posterUrl(null)
                    .build());
        }

        merged.sort(Comparator.comparing(UnifiedEventResponse::getDate,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return merged;
    }

    @Transactional(readOnly = true)
    public List<CampusEventResponse> listUpcoming() {
        LocalDate today = LocalDate.now();
        return eventRepository.findByActiveTrueOrderByEventDateAsc().stream()
                .filter(e -> e.getEventDate() == null || !e.getEventDate().isBefore(today))
                .map(this::map)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CampusEventResponse> listAll() {
        return eventRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::map)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deactivate(Long id) {
        CampusEvent event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
        event.setActive(false);
        eventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public String getPosterContentType(Long id) {
        CampusEvent event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
        return event.getPosterContentType() != null ? event.getPosterContentType() : "image/png";
    }

    public byte[] downloadPoster(Long id) throws IOException {
        CampusEvent event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
        if (event.getPosterPath() == null) {
            throw new ResourceNotFoundException("This event has no poster");
        }
        return s3StorageService.download(bucket, event.getPosterPath());
    }

    private CampusEventResponse map(CampusEvent event) {
        return CampusEventResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .eventDate(event.getEventDate())
                .posterName(event.getPosterName())
                .posterContentType(event.getPosterContentType())
                .posterUrl("/api/events/" + event.getId() + "/poster")
                .active(event.isActive())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
