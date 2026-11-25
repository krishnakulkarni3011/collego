package com.collego.service;

import com.collego.dto.FacultyDirectoryResponse;
import com.collego.entity.FacultyProfile;
import com.collego.entity.Notification;
import com.collego.entity.NotificationCategory;
import com.collego.entity.NotificationType;
import com.collego.entity.User;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Faculty directory and career-profile resumes.
 *
 * <p>Faculty members upload their own resume from the Career Profile tab. The
 * upload waits as PENDING until an administrator approves it; only approved
 * resumes are listed for (and downloadable by) students. Faculty can never see
 * another faculty member's resume.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class FacultyDirectoryService {

    public static final String STATUS_NONE = "NONE";
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_REJECTED = "REJECTED";

    private final FacultyProfileRepository facultyProfileRepository;
    private final NotificationRepository notificationRepository;
    private final S3StorageService s3StorageService;

    @Value("${collego.aws.s3-bucket-resumes:collego-resumes-prod}")
    private String resumeBucket;

    /** Public directory: only approved resumes are exposed. */
    public List<FacultyDirectoryResponse> listFaculty(Long departmentId) {
        List<FacultyProfile> profiles = departmentId != null
                ? facultyProfileRepository.findByDepartmentId(departmentId)
                : facultyProfileRepository.findAll();

        return profiles.stream()
                .filter(p -> p.getUser() != null && p.getUser().isActive())
                .sorted(facultyOrder())
                .map(p -> map(p, false))
                .collect(Collectors.toList());
    }

    /** Admin view: includes pending/rejected submissions. */
    public List<FacultyDirectoryResponse> listForAdmin(String status) {
        String wanted = status != null ? status.trim().toUpperCase(Locale.ROOT) : null;
        return facultyProfileRepository.findAll().stream()
                .filter(p -> p.getUser() != null && p.getResumePath() != null && !p.getResumePath().isBlank())
                .filter(p -> wanted == null || wanted.isBlank() || wanted.equals(resolveStatus(p)))
                .sorted(facultyOrder())
                .map(p -> map(p, true))
                .collect(Collectors.toList());
    }

    public FacultyDirectoryResponse getFaculty(Long facultyId) {
        return map(findFaculty(facultyId), false);
    }

    public FacultyDirectoryResponse getFacultyForAdmin(Long facultyId) {
        return map(findFaculty(facultyId), true);
    }

    public boolean isOwner(Long facultyId, String email) {
        FacultyProfile profile = findFaculty(facultyId);
        return profile.getUser() != null && profile.getUser().getEmail() != null
                && profile.getUser().getEmail().equalsIgnoreCase(email);
    }

    public FacultyDirectoryResponse getOwnProfile(String email) {
        return map(findByEmail(email), true);
    }

    /** Faculty self-upload — always starts as PENDING. */
    @Transactional
    public FacultyDirectoryResponse uploadOwnResume(String email, MultipartFile file) throws IOException {
        FacultyProfile faculty = findByEmail(email);
        storeResume(faculty, file);
        faculty.setResumeStatus(STATUS_PENDING);
        faculty.setResumeReviewNote(null);
        facultyProfileRepository.save(faculty);
        log.info("Faculty {} submitted a resume for approval", email);
        return map(faculty, true);
    }

    @Transactional
    public FacultyDirectoryResponse reviewResume(Long facultyId, boolean approve, String note) {
        FacultyProfile faculty = findFaculty(facultyId);
        if (faculty.getResumePath() == null || faculty.getResumePath().isBlank()) {
            throw new BadRequestException("This faculty member has not uploaded a resume yet.");
        }
        faculty.setResumeStatus(approve ? STATUS_APPROVED : STATUS_REJECTED);
        faculty.setResumeReviewNote(note != null && !note.isBlank() ? note.trim() : null);
        facultyProfileRepository.save(faculty);

        User user = faculty.getUser();
        String title = approve ? "Career profile approved" : "Career profile update";
        String message = approve
                ? "Your resume was approved by the administration and is now visible in the student faculty directory."
                : "Your resume was not approved" + (faculty.getResumeReviewNote() != null
                        ? ": " + faculty.getResumeReviewNote() : ". Please upload a revised copy.");
        notificationRepository.save(Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(NotificationType.ACADEMIC)
                .category(NotificationCategory.NOTICE)
                .build());

        log.info("Resume for faculty profile {} marked {}", facultyId, faculty.getResumeStatus());
        return map(faculty, true);
    }

    @Transactional
    public FacultyDirectoryResponse removeOwnResume(String email) {
        FacultyProfile faculty = findByEmail(email);
        clearResume(faculty);
        log.info("Faculty {} removed their resume", email);
        return map(faculty, true);
    }

    /** Admin or the owner may download any state. */
    public byte[] downloadResume(Long facultyId) throws IOException {
        FacultyProfile faculty = findFaculty(facultyId);
        if (faculty.getResumePath() == null || faculty.getResumePath().isBlank()) {
            throw new BadRequestException("No resume has been uploaded for this faculty member.");
        }
        return s3StorageService.download(resumeBucket, faculty.getResumePath());
    }

    /** Students may only download approved resumes. */
    public byte[] downloadApprovedResume(Long facultyId) throws IOException {
        FacultyProfile faculty = findFaculty(facultyId);
        if (!STATUS_APPROVED.equals(resolveStatus(faculty))) {
            throw new ResourceNotFoundException("No published resume is available for this faculty member.");
        }
        return s3StorageService.download(resumeBucket, faculty.getResumePath());
    }

    public byte[] downloadOwnResume(String email) throws IOException {
        return downloadResume(findByEmail(email).getId());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void storeResume(FacultyProfile faculty, MultipartFile file) throws IOException {
        validateResume(file);

        if (faculty.getResumePath() != null && !faculty.getResumePath().isBlank()) {
            try {
                s3StorageService.delete(resumeBucket, faculty.getResumePath());
            } catch (Exception ex) {
                log.warn("Could not delete previous resume for faculty {}: {}", faculty.getId(), ex.getMessage());
            }
        }

        String original = file.getOriginalFilename();
        String uniqueName = UUID.randomUUID() + "_" + sanitizeFilename(original);
        String key = "faculty/" + faculty.getId() + "/" + uniqueName;
        s3StorageService.upload(resumeBucket, key, file.getInputStream(), file.getSize(),
                S3StorageService.detectContentType(original));

        faculty.setResumeFileName(original != null ? original : uniqueName);
        faculty.setResumePath(key);
    }

    private void clearResume(FacultyProfile faculty) {
        if (faculty.getResumePath() != null && !faculty.getResumePath().isBlank()) {
            try {
                s3StorageService.delete(resumeBucket, faculty.getResumePath());
            } catch (Exception ex) {
                log.warn("Could not delete resume for faculty {}: {}", faculty.getId(), ex.getMessage());
            }
        }
        faculty.setResumePath(null);
        faculty.setResumeFileName(null);
        faculty.setResumeStatus(STATUS_NONE);
        faculty.setResumeReviewNote(null);
        facultyProfileRepository.save(faculty);
    }

    private Comparator<FacultyProfile> facultyOrder() {
        return Comparator
                .comparing((FacultyProfile p) -> p.getDepartment() != null
                        ? p.getDepartment().getName() : "", String.CASE_INSENSITIVE_ORDER)
                .thenComparing(p -> p.getUser().getFirstName(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(p -> p.getUser().getLastName(), String.CASE_INSENSITIVE_ORDER);
    }

    private FacultyProfile findFaculty(Long facultyId) {
        return facultyProfileRepository.findById(facultyId)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty not found: " + facultyId));
    }

    private FacultyProfile findByEmail(String email) {
        return facultyProfileRepository.findByUserEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty profile not found"));
    }

    private String resolveStatus(FacultyProfile profile) {
        if (profile.getResumePath() == null || profile.getResumePath().isBlank()) return STATUS_NONE;
        return profile.getResumeStatus() != null ? profile.getResumeStatus() : STATUS_APPROVED;
    }

    private void validateResume(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please choose a resume file.");
        }
        if (file.getSize() > 10L * 1024 * 1024) {
            throw new BadRequestException("Resume must be 10 MB or smaller.");
        }
        String name = file.getOriginalFilename();
        if (name != null) {
            String lower = name.toLowerCase(Locale.ROOT);
            if (!(lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx"))) {
                throw new BadRequestException("Resume must be a PDF or Word document.");
            }
        }
    }

    private String sanitizeFilename(String name) {
        if (name == null) return "resume";
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private FacultyDirectoryResponse map(FacultyProfile profile, boolean forAdmin) {
        User user = profile.getUser();
        String status = resolveStatus(profile);
        boolean approved = STATUS_APPROVED.equals(status);
        return FacultyDirectoryResponse.builder()
                .id(profile.getId())
                .userId(user != null ? user.getId() : null)
                .name(user != null ? user.getFirstName() + " " + user.getLastName() : "Faculty")
                .email(user != null ? user.getEmail() : null)
                .employeeId(profile.getEmployeeId())
                .designation(profile.getDesignation())
                .departmentId(profile.getDepartment() != null ? profile.getDepartment().getId() : null)
                .departmentName(profile.getDepartment() != null ? profile.getDepartment().getName() : null)
                .departmentCode(profile.getDepartment() != null ? profile.getDepartment().getCode() : null)
                .resumeFileName(forAdmin || approved ? profile.getResumeFileName() : null)
                .hasResume(forAdmin ? !STATUS_NONE.equals(status) : approved)
                .resumeStatus(status)
                .resumeReviewNote(forAdmin ? profile.getResumeReviewNote() : null)
                .active(user != null && user.isActive())
                .isHod(Boolean.TRUE.equals(profile.getIsHod()))
                .build();
    }
}
