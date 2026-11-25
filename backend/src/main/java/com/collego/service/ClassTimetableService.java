package com.collego.service;

import com.collego.dto.ClassTimetableResponse;
import com.collego.entity.ClassTimetable;
import com.collego.entity.Department;
import com.collego.entity.FacultyProfile;
import com.collego.entity.StudentProfile;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.ClassTimetableRepository;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.StudentProfileRepository;
import com.collego.util.AcademicYearUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * HoD-managed class timetables: one PDF per department + academic year + section.
 *
 * Students never pass an id; their own profile (JWT e-mail) determines which
 * timetable they can read or download, so one student can never fetch another
 * class's PDF.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class ClassTimetableService {

    private static final long MAX_FILE_BYTES = 15L * 1024 * 1024; // 15 MB
    private static final List<String> DEFAULT_SECTIONS = List.of("A", "B");

    private final ClassTimetableRepository timetableRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final S3StorageService s3StorageService;

    /**
     * Reuse the materials bucket (which already exists in every environment)
     * instead of provisioning a separate timetable bucket. Keys are namespaced
     * under timetables/class/ so they never collide with study materials.
     */
    @Value("${collego.aws.s3-bucket-materials:collego-materials-prod}")
    private String timetableBucket;

    // ==================== HoD ====================

    /** Every year × section slot in the HoD's department, with upload state. */
    @Transactional(readOnly = true)
    public List<ClassTimetableResponse> listForHod(String email) {
        FacultyProfile hod = requireHod(email);
        Department department = hod.getDepartment();

        Map<String, ClassTimetable> uploaded = timetableRepository
                .findByDepartmentIdOrderByYearAscSectionNameAsc(department.getId())
                .stream()
                .collect(Collectors.toMap(
                        t -> key(t.getYear(), t.getSectionName()),
                        t -> t,
                        (a, b) -> a,
                        LinkedHashMap::new));

        LinkedHashSet<String> sections = new LinkedHashSet<>();
        studentProfileRepository.findByDepartmentId(department.getId()).stream()
                .map(StudentProfile::getSection)
                .filter(Objects::nonNull)
                .map(this::normaliseSection)
                .filter(s -> !s.isBlank())
                .forEach(sections::add);
        uploaded.values().stream().map(ClassTimetable::getSectionName)
                .map(this::normaliseSection).forEach(sections::add);
        if (sections.isEmpty()) sections.addAll(DEFAULT_SECTIONS);

        List<String> orderedSections = sections.stream().sorted().collect(Collectors.toList());
        List<ClassTimetableResponse> rows = new ArrayList<>();
        for (int year = 1; year <= 4; year++) {
            for (String section : orderedSections) {
                ClassTimetable existing = uploaded.get(key(year, section));
                rows.add(existing != null
                        ? map(existing)
                        : ClassTimetableResponse.builder()
                                .departmentId(department.getId())
                                .departmentName(department.getName())
                                .year(year)
                                .yearLabel(AcademicYearUtils.label(year))
                                .sectionName(section)
                                .hasFile(false)
                                .build());
            }
        }
        return rows;
    }

    @Transactional
    public ClassTimetableResponse uploadForHod(String email, Integer year, String sectionName, MultipartFile file)
            throws IOException {
        FacultyProfile hod = requireHod(email);
        if (year == null || year < 1 || year > 4) {
            throw new BadRequestException("Select a year between I Year and Final Year.");
        }
        String section = normaliseSection(sectionName);
        if (section.isBlank()) {
            throw new BadRequestException("Select a section.");
        }
        validatePdf(file);

        Department department = hod.getDepartment();
        ClassTimetable record = timetableRepository
                .findByDepartmentIdAndYearAndSectionNameIgnoreCase(department.getId(), year, section)
                .orElse(null);
        String previousPath = record != null ? record.getFilePath() : null;

        String originalName = cleanFileName(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "timetable.pdf");
        String uniqueName = UUID.randomUUID() + "_" + sanitize(originalName);
        String key = "timetables/class/" + department.getId() + "/" + year + "/" + section + "/" + uniqueName;
        String contentType = S3StorageService.detectContentType(originalName);
        s3StorageService.upload(timetableBucket, key, file.getInputStream(), file.getSize(), contentType);

        if (record == null) {
            record = ClassTimetable.builder()
                    .department(department)
                    .year(year)
                    .sectionName(section)
                    .build();
        }
        record.setFileName(originalName);
        record.setFilePath(key);
        record.setContentType(contentType);
        record.setUploadedBy(hod);
        record.setUploadedAt(LocalDateTime.now());
        record = timetableRepository.save(record);

        // Only remove the previous object after the replacement is safely saved.
        if (previousPath != null) {
            try {
                s3StorageService.delete(timetableBucket, previousPath);
            } catch (Exception e) {
                log.warn("Could not delete old class timetable {}: {}", previousPath, e.getMessage());
            }
        }

        log.info("HoD {} uploaded class timetable for {} {} section {}",
                email, department.getCode(), AcademicYearUtils.label(year), section);
        return map(record);
    }

    @Transactional
    public void deleteForHod(String email, Long id) {
        FacultyProfile hod = requireHod(email);
        ClassTimetable record = timetableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Class timetable not found: " + id));
        if (record.getDepartment() == null
                || !record.getDepartment().getId().equals(hod.getDepartment().getId())) {
            throw new AccessDeniedException("You can only manage timetables in your own department.");
        }
        try {
            if (record.getFilePath() != null) {
                s3StorageService.delete(timetableBucket, record.getFilePath());
            }
        } catch (Exception e) {
            log.warn("Could not delete class timetable file {}: {}", record.getFilePath(), e.getMessage());
        }
        timetableRepository.delete(record);
    }

    @Transactional(readOnly = true)
    public byte[] downloadForHod(String email, Long id) throws IOException {
        FacultyProfile hod = requireHod(email);
        ClassTimetable record = timetableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Class timetable not found: " + id));
        if (record.getDepartment() == null
                || !record.getDepartment().getId().equals(hod.getDepartment().getId())) {
            throw new AccessDeniedException("You can only view timetables in your own department.");
        }
        return s3StorageService.download(timetableBucket, record.getFilePath());
    }

    // ==================== Student ====================

    /** The signed-in student's own class timetable, or null when none exists. */
    @Transactional(readOnly = true)
    public ClassTimetableResponse getForStudent(String email) {
        StudentProfile student = studentProfileRepository.findByUserEmailIgnoreCase(email).orElse(null);
        if (student == null || student.getDepartment() == null) return null;
        Integer year = AcademicYearUtils.fromSemester(student.getSemester());
        String section = normaliseSection(student.getSection());
        if (year == null || section.isBlank()) return null;
        return timetableRepository
                .findByDepartmentIdAndYearAndSectionNameIgnoreCase(student.getDepartment().getId(), year, section)
                .map(this::map)
                .orElse(null);
    }

    /** Downloads the signed-in student's own timetable; no id is accepted. */
    @Transactional(readOnly = true)
    public byte[] downloadForStudent(String email) throws IOException {
        StudentProfile student = studentProfileRepository.findByUserEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        if (student.getDepartment() == null) {
            throw new ResourceNotFoundException("No class timetable is available for your profile yet.");
        }
        Integer year = AcademicYearUtils.fromSemester(student.getSemester());
        String section = normaliseSection(student.getSection());
        if (year == null || section.isBlank()) {
            throw new ResourceNotFoundException("No class timetable is available for your profile yet.");
        }
        ClassTimetable record = timetableRepository
                .findByDepartmentIdAndYearAndSectionNameIgnoreCase(student.getDepartment().getId(), year, section)
                .orElseThrow(() -> new ResourceNotFoundException("No class timetable has been uploaded for your class yet."));
        return s3StorageService.download(timetableBucket, record.getFilePath());
    }

    // ==================== Helpers ====================

    private FacultyProfile requireHod(String email) {
        FacultyProfile faculty = facultyProfileRepository.findByUserEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty profile not found"));
        if (!Boolean.TRUE.equals(faculty.getIsHod())) {
            throw new AccessDeniedException("Only the Head of Department can manage class timetables.");
        }
        if (faculty.getDepartment() == null) {
            throw new BadRequestException("Your faculty profile has no department assigned.");
        }
        return faculty;
    }

    private ClassTimetableResponse map(ClassTimetable t) {
        return ClassTimetableResponse.builder()
                .id(t.getId())
                .departmentId(t.getDepartment() != null ? t.getDepartment().getId() : null)
                .departmentName(t.getDepartment() != null ? t.getDepartment().getName() : null)
                .year(t.getYear())
                .yearLabel(AcademicYearUtils.label(t.getYear()))
                .sectionName(t.getSectionName())
                .fileName(t.getFileName())
                .uploadedAt(t.getUploadedAt())
                .hasFile(t.getFilePath() != null && !t.getFilePath().isBlank())
                .build();
    }

    private String key(Integer year, String section) {
        return year + "|" + normaliseSection(section);
    }

    private String normaliseSection(String section) {
        return section == null ? "" : section.trim().toUpperCase(Locale.ROOT);
    }

    private void validatePdf(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Choose a PDF timetable to upload.");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new BadRequestException("Timetable PDF is too large. The maximum size is 15 MB.");
        }
        String name = file.getOriginalFilename();
        if (name == null || !name.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new BadRequestException("Only PDF files are allowed for timetables.");
        }
        // Extension alone is easy to spoof; make sure the bytes really are a PDF.
        try (InputStream in = file.getInputStream()) {
            byte[] header = in.readNBytes(5);
            if (!"%PDF-".equals(new String(header, StandardCharsets.US_ASCII))) {
                throw new BadRequestException("Only PDF files are allowed for timetables.");
            }
        }
    }

    private String sanitize(String name) {
        if (name == null) return "timetable.pdf";
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    /** Keep only the base file name; strip paths and header-breaking control chars. */
    private String cleanFileName(String name) {
        String cleaned = name.replace('\\', '/');
        int slash = cleaned.lastIndexOf('/');
        if (slash >= 0) cleaned = cleaned.substring(slash + 1);
        cleaned = cleaned.replaceAll("[\\r\\n\\t]", "").trim();
        if (cleaned.length() > 200) {
            // Keep the tail so the .pdf extension survives.
            cleaned = cleaned.substring(cleaned.length() - 200);
        }
        return cleaned.isEmpty() ? "timetable.pdf" : cleaned;
    }
}
