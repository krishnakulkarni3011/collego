package com.collego.service;

import com.collego.dto.NewsletterResponse;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

/** HoD department newsletters, visible to every faculty member and student of that department. */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class NewsletterService {

    private final NewsletterRepository newsletterRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final NotificationRepository notificationRepository;
    private final S3StorageService s3StorageService;

    @Value("${collego.aws.s3-bucket-materials:collego-materials-prod}")
    private String bucket;

    @Transactional
    public NewsletterResponse uploadForHod(String email, String title, MultipartFile file) throws IOException {
        FacultyProfile hod = requireHod(email);
        if (title == null || title.isBlank()) {
            throw new BadRequestException("Newsletter title is required");
        }
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Choose a newsletter file to upload");
        }
        if (file.getSize() > 10L * 1024 * 1024) {
            throw new BadRequestException("Newsletter file must be 10 MB or smaller");
        }
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "newsletter.pdf";
        String lower = originalName.toLowerCase(Locale.ROOT);
        if (!(lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx"))) {
            throw new BadRequestException("Upload a PDF or Word newsletter.");
        }

        String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String key = "newsletters/" + hod.getDepartment().getId() + "/"
                + UUID.randomUUID() + "_" + safeName;
        s3StorageService.upload(bucket, key, file.getInputStream(), file.getSize(),
                S3StorageService.detectContentType(originalName));

        Newsletter newsletter = newsletterRepository.save(Newsletter.builder()
                .department(hod.getDepartment())
                .title(title.trim())
                .fileName(originalName)
                .filePath(key)
                .contentType(S3StorageService.detectContentType(originalName))
                .fileSize(file.getSize())
                .uploadedBy(hod)
                .build());

        notifyDepartment(newsletter);
        log.info("HoD {} uploaded newsletter '{}' for department {}", email, newsletter.getTitle(),
                hod.getDepartment().getId());
        return map(newsletter);
    }

    @Transactional(readOnly = true)
    public List<NewsletterResponse> listForFaculty(String email) {
        FacultyProfile faculty = facultyProfileRepository.findByUserEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty profile not found"));
        if (faculty.getDepartment() == null) {
            return List.of();
        }
        return newsletterRepository.findByDepartmentIdOrderByCreatedAtDesc(faculty.getDepartment().getId())
                .stream().map(this::map).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<NewsletterResponse> listForStudent(String email) {
        StudentProfile student = studentProfileRepository.findByUserEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        if (student.getDepartment() == null) {
            return List.of();
        }
        return newsletterRepository.findByDepartmentIdOrderByCreatedAtDesc(student.getDepartment().getId())
                .stream().map(this::map).collect(Collectors.toList());
    }

    public byte[] download(Long id) throws IOException {
        Newsletter newsletter = newsletterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Newsletter not found: " + id));
        return s3StorageService.download(bucket, newsletter.getFilePath());
    }

    private void notifyDepartment(Newsletter newsletter) {
        Long departmentId = newsletter.getDepartment().getId();
        String message = "New department newsletter: " + newsletter.getTitle();
        for (FacultyProfile faculty : facultyProfileRepository.findByDepartmentId(departmentId)) {
            if (faculty.getUser() != null) {
                saveNotification(faculty.getUser(), message);
            }
        }
        for (StudentProfile student : studentProfileRepository.findByDepartmentId(departmentId)) {
            if (student.getUser() != null) {
                saveNotification(student.getUser(), message);
            }
        }
    }

    private void saveNotification(User user, String message) {
        notificationRepository.save(Notification.builder()
                .user(user)
                .title("Department Newsletter")
                .message(message)
                .type(NotificationType.ACADEMIC)
                .category(NotificationCategory.NOTICE)
                .build());
    }

    private FacultyProfile requireHod(String email) {
        FacultyProfile faculty = facultyProfileRepository.findByUserEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty profile not found"));
        if (!Boolean.TRUE.equals(faculty.getIsHod())) {
            throw new AccessDeniedException("Only the Head of Department can upload a newsletter.");
        }
        if (faculty.getDepartment() == null) {
            throw new BadRequestException("Your faculty profile has no department assigned.");
        }
        return faculty;
    }

    private NewsletterResponse map(Newsletter n) {
        String uploader = n.getUploadedBy() != null && n.getUploadedBy().getUser() != null
                ? n.getUploadedBy().getUser().getFirstName() + " " + n.getUploadedBy().getUser().getLastName()
                : "Head of Department";
        return NewsletterResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .fileName(n.getFileName())
                .departmentName(n.getDepartment() != null ? n.getDepartment().getName() : null)
                .uploadedByName(uploader.trim())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
