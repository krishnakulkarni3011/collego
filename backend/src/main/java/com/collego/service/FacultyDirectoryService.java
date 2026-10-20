package com.collego.service;

import com.collego.dto.FacultyDirectoryResponse;
import com.collego.entity.FacultyProfile;
import com.collego.entity.User;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.FacultyProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Faculty directory and resume management. Resumes are uploaded by an admin
 * and can be viewed by students and faculty members.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class FacultyDirectoryService {

    private final FacultyProfileRepository facultyProfileRepository;
    private final S3StorageService s3StorageService;

    @Value("${collego.aws.s3-bucket-resumes:collego-resumes-prod}")
    private String resumeBucket;

    public List<FacultyDirectoryResponse> listFaculty(Long departmentId) {
        List<FacultyProfile> profiles = departmentId != null
                ? facultyProfileRepository.findByDepartmentId(departmentId)
                : facultyProfileRepository.findAll();

        return profiles.stream()
                .filter(p -> p.getUser() != null && p.getUser().isActive())
                .sorted(Comparator
                        .comparing((FacultyProfile p) -> p.getDepartment() != null
                                ? p.getDepartment().getName() : "", String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(p -> p.getUser().getFirstName(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(p -> p.getUser().getLastName(), String.CASE_INSENSITIVE_ORDER))
                .map(this::map)
                .collect(Collectors.toList());
    }

    public FacultyDirectoryResponse getFaculty(Long facultyId) {
        return map(findFaculty(facultyId));
    }

    @Transactional
    public FacultyDirectoryResponse uploadResume(Long facultyId, MultipartFile file) throws IOException {
        FacultyProfile faculty = findFaculty(facultyId);
        validateResume(file);

        if (faculty.getResumePath() != null && !faculty.getResumePath().isBlank()) {
            s3StorageService.delete(resumeBucket, faculty.getResumePath());
        }

        String original = file.getOriginalFilename();
        String uniqueName = UUID.randomUUID() + "_" + sanitizeFilename(original);
        String key = "faculty/" + facultyId + "/" + uniqueName;
        s3StorageService.upload(resumeBucket, key, file.getInputStream(), file.getSize(),
                S3StorageService.detectContentType(original));

        faculty.setResumeFileName(original != null ? original : uniqueName);
        faculty.setResumePath(key);
        facultyProfileRepository.save(faculty);

        log.info("Resume uploaded for faculty profile {} ({})", facultyId, faculty.getUser().getEmail());
        return map(faculty);
    }

    @Transactional
    public FacultyDirectoryResponse removeResume(Long facultyId) {
        FacultyProfile faculty = findFaculty(facultyId);
        if (faculty.getResumePath() != null && !faculty.getResumePath().isBlank()) {
            s3StorageService.delete(resumeBucket, faculty.getResumePath());
        }
        faculty.setResumePath(null);
        faculty.setResumeFileName(null);
        facultyProfileRepository.save(faculty);
        return map(faculty);
    }

    public byte[] downloadResume(Long facultyId) throws IOException {
        FacultyProfile faculty = findFaculty(facultyId);
        if (faculty.getResumePath() == null || faculty.getResumePath().isBlank()) {
            throw new BadRequestException("No resume has been uploaded for this faculty member.");
        }
        return s3StorageService.download(resumeBucket, faculty.getResumePath());
    }

    private FacultyProfile findFaculty(Long facultyId) {
        return facultyProfileRepository.findById(facultyId)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty not found: " + facultyId));
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
            String lower = name.toLowerCase();
            if (!(lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx"))) {
                throw new BadRequestException("Resume must be a PDF or Word document.");
            }
        }
    }

    private String sanitizeFilename(String name) {
        if (name == null) return "resume";
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private FacultyDirectoryResponse map(FacultyProfile profile) {
        User user = profile.getUser();
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
                .resumeFileName(profile.getResumeFileName())
                .hasResume(profile.getResumePath() != null && !profile.getResumePath().isBlank())
                .active(user != null && user.isActive())
                .build();
    }
}
