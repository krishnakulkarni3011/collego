package com.collego.service;

import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.*;
import com.collego.util.AcademicYearUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class FacultyPortalService {

    private final UserRepository userRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final SectionRepository sectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final HolidayRepository holidayRepository;
    private final InternalMarksRepository internalMarksRepository;
    private final SemesterMarksRepository semesterMarksRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository assignmentSubmissionRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final QuestionPaperRepository questionPaperRepository;
    private final NotificationRepository notificationRepository;
    private final CourseRepository courseRepository;
    private final DepartmentRepository departmentRepository;
    private final SemesterRepository semesterRepository;
    private final FacultySubjectAssignmentRepository facultySubjectAssignmentRepository;
    private final QuestionPaperService questionPaperService;
    private final S3StorageService s3StorageService;

    @Value("${collego.aws.s3-bucket-assignments:collego-assignments-prod}")
    private String assignmentBucket;

    @Value("${collego.aws.s3-bucket-materials:collego-materials-prod}")
    private String materialBucket;

    @Value("${collego.aws.s3-bucket-question-papers:collego-question-papers-prod}")
    private String questionPaperBucket;

    // ==================== Sections ====================

    public List<FacultySectionResponse> getAssignedSections(String email) {
        FacultyProfile faculty = getFacultyByEmail(email);
        List<Section> sections = sectionRepository.findByFacultyId(faculty.getId()).stream()
                .filter(section -> !section.isHidden())
                .collect(Collectors.toList());

        return sections.stream().map(section -> {
            long enrolledCount = enrollmentRepository.countBySectionId(section.getId());

            return FacultySectionResponse.builder()
                    .sectionId(section.getId())
                    .sectionName(section.getName())
                    .courseId(section.getCourse().getId())
                    .courseName(section.getCourse().getName())
                    .courseCode(section.getCourse().getCode())
                    .departmentId(section.getCourse().getDepartment() != null
                            ? section.getCourse().getDepartment().getId() : null)
                    .departmentName(section.getCourse().getDepartment() != null
                            ? section.getCourse().getDepartment().getName() : null)
                    .credits(section.getCourse().getCredits())
                    .semesterId(section.getSemester().getId())
                    .semesterName(section.getSemester().getName())
                    .semesterNumber(section.getSemester().getNumber())
                    .year((section.getSemester().getNumber() + 1) / 2)
                    .enrolledStudents(enrolledCount)
                    .build();
        }).collect(Collectors.toList());
    }

    // ==================== Attendance ====================

    @Transactional
    public BulkAttendanceResponse markAttendance(String email, BulkAttendanceRequest request) {
        FacultyProfile faculty = getFacultyByEmail(email);
        User facultyUser = faculty.getUser();

        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + request.getSectionId()));

        // Verify this section belongs to the faculty
        validateFacultyOwnsSection(faculty, section);

        if (holidayRepository.existsBySectionIdAndDate(section.getId(), request.getDate())) {
            throw new BadRequestException(
                    "This day is declared as a holiday for this section. Remove the holiday before marking attendance.");
        }

        int markedPresent = 0;
        int markedAbsent = 0;

        for (BulkAttendanceRequest.StudentAttendanceEntry entry : request.getRecords()) {
            StudentProfile student = studentProfileRepository.findById(entry.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + entry.getStudentId()));

            // Verify student is enrolled in this section
            if (!enrollmentRepository.existsByStudentIdAndSectionId(student.getId(), section.getId())) {
                throw new BadRequestException("Student " + entry.getStudentId() + " is not enrolled in section " + section.getId());
            }

            AttendanceStatus status = AttendanceStatus.valueOf(entry.getStatus().toUpperCase());

            // Upsert: update if exists, create if not
            Optional<Attendance> existing = attendanceRepository
                    .findByStudentIdAndSectionIdAndDate(student.getId(), section.getId(), request.getDate());

            if (existing.isPresent()) {
                existing.get().setStatus(status);
                attendanceRepository.save(existing.get());
            } else {
                Attendance attendance = Attendance.builder()
                        .student(student)
                        .section(section)
                        .date(request.getDate())
                        .status(status)
                        .markedBy(facultyUser)
                        .build();
                attendanceRepository.save(attendance);
            }

            if (status == AttendanceStatus.PRESENT) {
                markedPresent++;
            } else {
                markedAbsent++;
            }
        }

        log.info("Faculty {} marked attendance for section {} on {}: {} present, {} absent",
                email, section.getId(), request.getDate(), markedPresent, markedAbsent);

        return BulkAttendanceResponse.builder()
                .sectionId(section.getId())
                .date(request.getDate())
                .totalStudents(request.getRecords().size())
                .markedPresent(markedPresent)
                .markedAbsent(markedAbsent)
                .message("Attendance marked successfully")
                .build();
    }

    public List<Map<String, Object>> getAttendanceForSection(String email, Long sectionId) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionId));
        validateFacultyOwnsSection(faculty, section);

        // Get all enrolled students
        List<Enrollment> enrollments = enrollmentRepository.findBySectionId(sectionId);

        return enrollments.stream().map(enrollment -> {
            StudentProfile student = enrollment.getStudent();
            User studentUser = student.getUser();

            long total = attendanceRepository.countByStudentIdAndSectionId(student.getId(), sectionId);
            long present = attendanceRepository.countByStudentIdAndSectionIdAndStatus(
                    student.getId(), sectionId, AttendanceStatus.PRESENT);
            double percentage = total > 0 ? Math.round((present * 100.0) / total * 100.0) / 100.0 : 0.0;

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("studentId", student.getId());
            entry.put("enrollmentNumber", student.getEnrollmentNumber());
            entry.put("studentName", studentUser.getFirstName() + " " + studentUser.getLastName());
            entry.put("totalClasses", total);
            entry.put("present", present);
            entry.put("absent", total - present);
            entry.put("percentage", percentage);
            return entry;
        }).collect(Collectors.toList());
    }

    // ==================== Holidays ====================

    @Transactional
    public HolidayResponse declareHoliday(String email, HolidayRequest request) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + request.getSectionId()));
        validateFacultyOwnsSection(faculty, section);

        // A holiday means the class did not happen: remove any attendance that
        // was already marked for that day so it is not counted as absent.
        List<Attendance> existing = attendanceRepository.findBySectionIdAndDate(
                section.getId(), request.getDate());
        if (!existing.isEmpty()) {
            attendanceRepository.deleteAll(existing);
        }

        Holiday holiday = holidayRepository.findBySectionIdAndDate(section.getId(), request.getDate())
                .orElseGet(() -> Holiday.builder().section(section).date(request.getDate()).build());
        holiday.setNote(normaliseHolidayNote(request.getNote()));
        holiday.setDeclaredBy(faculty.getUser());
        holiday = holidayRepository.save(holiday);

        log.info("Faculty {} declared holiday for section {} on {}", email, section.getId(), request.getDate());
        return HolidayMapper.toResponse(holiday);
    }

    @Transactional(readOnly = true)
    public List<HolidayResponse> getHolidaysForSection(String email, Long sectionId) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionId));
        validateFacultyOwnsSection(faculty, section);

        return holidayRepository.findBySectionIdOrderByDateDesc(sectionId).stream()
                .map(HolidayMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void removeHoliday(String email, Long holidayId) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Holiday holiday = holidayRepository.findById(holidayId)
                .orElseThrow(() -> new ResourceNotFoundException("Holiday not found: " + holidayId));
        validateFacultyOwnsSection(faculty, holiday.getSection());

        holidayRepository.delete(holiday);
        log.info("Faculty {} removed holiday {} for section {}", email, holidayId, holiday.getSection().getId());
    }

    private String normaliseHolidayNote(String note) {
        if (note == null) return null;
        String trimmed = note.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed.length() > 300 ? trimmed.substring(0, 300) : trimmed;
    }

    // ==================== Internal Marks ====================

    @Transactional
    public Map<String, Object> uploadInternalMarks(String email, UploadMarksRequest request) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + request.getSectionId()));
        validateFacultyOwnsSection(faculty, section);

        int updated = 0;
        int created = 0;

        for (UploadMarksRequest.StudentMarksEntry entry : request.getEntries()) {
            StudentProfile student = studentProfileRepository.findById(entry.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + entry.getStudentId()));

            if (!enrollmentRepository.existsByStudentIdAndSectionId(student.getId(), section.getId())) {
                throw new BadRequestException("Student " + entry.getStudentId() + " is not enrolled in section " + section.getId());
            }

            if (entry.getObtainedMarks() > request.getMaxMarks()) {
                throw new BadRequestException("Obtained marks (" + entry.getObtainedMarks() + ") exceeds max marks (" + request.getMaxMarks() + ") for student " + entry.getStudentId());
            }

            // Upsert: update if exists for same student+section+examName
            Optional<InternalMarks> existing = internalMarksRepository
                    .findByStudentIdAndSectionIdAndExamName(student.getId(), section.getId(), request.getExamName());

            if (existing.isPresent()) {
                existing.get().setMaxMarks(request.getMaxMarks());
                existing.get().setObtainedMarks(entry.getObtainedMarks());
                internalMarksRepository.save(existing.get());
                updated++;
            } else {
                InternalMarks marks = InternalMarks.builder()
                        .student(student)
                        .section(section)
                        .examName(request.getExamName())
                        .maxMarks(request.getMaxMarks())
                        .obtainedMarks(entry.getObtainedMarks())
                        .build();
                internalMarksRepository.save(marks);
                created++;
            }
        }

        log.info("Faculty {} uploaded internal marks for section {} exam {}: {} created, {} updated",
                email, section.getId(), request.getExamName(), created, updated);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sectionId", section.getId());
        result.put("examName", request.getExamName());
        result.put("created", created);
        result.put("updated", updated);
        result.put("message", "Internal marks uploaded successfully");
        return result;
    }

    public List<Map<String, Object>> getInternalMarksForSection(String email, Long sectionId) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionId));
        validateFacultyOwnsSection(faculty, section);

        List<Enrollment> enrollments = enrollmentRepository.findBySectionId(sectionId);

        // Return one flat row per recorded exam mark so the faculty UI can render
        // the "Recorded Marks" table directly after an upload.
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Enrollment enrollment : enrollments) {
            StudentProfile student = enrollment.getStudent();
            User studentUser = student.getUser();
            String studentName = studentUser.getFirstName() + " " + studentUser.getLastName();

            for (InternalMarks mark : internalMarksRepository.findByStudentIdAndSectionId(student.getId(), sectionId)) {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("id", mark.getId());
                entry.put("studentId", student.getId());
                entry.put("enrollmentNumber", student.getEnrollmentNumber());
                entry.put("studentName", studentName);
                entry.put("examName", mark.getExamName());
                entry.put("maxMarks", mark.getMaxMarks());
                entry.put("obtainedMarks", mark.getObtainedMarks());
                entry.put("createdAt", mark.getCreatedAt());
                rows.add(entry);
            }
        }

        return rows;
    }

    // ==================== Assignments ====================

    @Transactional
    public AssignmentResponse createAssignment(String email, CreateAssignmentRequest request) {
        FacultyProfile faculty = getFacultyByEmail(email);
        User facultyUser = faculty.getUser();

        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + request.getSectionId()));
        validateFacultyOwnsSection(faculty, section);

        Assignment assignment = Assignment.builder()
                .section(section)
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .maxMarks(request.getMaxMarks() != null && request.getMaxMarks() > 0 ? request.getMaxMarks() : 10)
                .targetYear(validateTargetYear(request.getTargetYear()))
                .fileName(request.getFileName())
                .uploadedBy(facultyUser)
                .build();

        assignment = assignmentRepository.save(assignment);

        notifyDepartmentYear(section.getCourse() != null ? section.getCourse().getDepartment() : faculty.getDepartment(),
                assignment.getTargetYear(),
                "New assignment: " + assignment.getTitle(),
                "A new assignment was posted for " + section.getCourse().getName()
                        + (assignment.getDueDate() != null ? ". Due " + assignment.getDueDate() : "."),
                NotificationCategory.ASSIGNMENT);

        log.info("Faculty {} created assignment '{}' for section {}", email, request.getTitle(), section.getId());

        return mapAssignmentToResponse(assignment);
    }

    public List<AssignmentResponse> getAssignments(String email, Long sectionId) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionId));
        validateFacultyOwnsSection(faculty, section);

        return assignmentRepository.findBySectionIdOrderByCreatedAtDesc(sectionId)
                .stream()
                .map(this::mapAssignmentToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Phase 8: Upload the actual file for an existing assignment to S3.
     * S3 key: {sectionId}/{assignmentId}/{uuid}_{originalFilename}
     */
    @Transactional
    public AssignmentResponse uploadAssignmentFile(String email, Long assignmentId, MultipartFile file) throws IOException {
        FacultyProfile faculty = getFacultyByEmail(email);
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));
        validateFacultyOwnsSection(faculty, assignment.getSection());

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File must not be empty.");
        }

        String uniqueName = java.util.UUID.randomUUID() + "_" + sanitizeFilename(file.getOriginalFilename());
        String s3Key = assignment.getSection().getId() + "/" + assignmentId + "/" + uniqueName;

        // Replace existing file in S3 if one is already stored
        if (assignment.getFilePath() != null && !assignment.getFilePath().isBlank()) {
            s3StorageService.delete(assignmentBucket, assignment.getFilePath());
        }

        s3StorageService.upload(assignmentBucket, s3Key, file.getInputStream(),
                file.getSize(), S3StorageService.detectContentType(file.getOriginalFilename()));

        assignment.setFilePath(s3Key);
        assignment.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : uniqueName);
        assignmentRepository.save(assignment);

        log.info("Faculty {} uploaded assignment file to S3: s3://{}/{}", email, assignmentBucket, s3Key);
        return mapAssignmentToResponse(assignment);
    }

    /**
     * Phase 8: Download the file for an assignment from S3.
     */
    public byte[] downloadAssignmentFile(String email, Long assignmentId) throws IOException {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));
        if (assignment.getFilePath() == null || assignment.getFilePath().isBlank()) {
            throw new BadRequestException("No file attached to this assignment.");
        }
        return s3StorageService.download(assignmentBucket, assignment.getFilePath());
    }

    // ==================== Assignment Submissions (grading) ====================

    public List<AssignmentSubmissionResponse> getSubmissions(String email, Long assignmentId) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));
        validateFacultyOwnsSection(faculty, assignment.getSection());
        return assignmentSubmissionRepository.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId)
                .stream()
                .map(this::mapSubmissionToResponse)
                .collect(Collectors.toList());
    }

    /** Download a student's submitted file (faculty must own the section). */
    public byte[] downloadSubmissionFile(String email, Long submissionId) throws IOException {
        FacultyProfile faculty = getFacultyByEmail(email);
        AssignmentSubmission submission = assignmentSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        validateFacultyOwnsSection(faculty, submission.getAssignment().getSection());

        if (submission.getFilePath() == null || submission.getFilePath().isBlank()) {
            throw new BadRequestException("No file attached to this submission.");
        }
        return s3StorageService.download(assignmentBucket, submission.getFilePath());
    }

    /** Grade a student's submission. Marks may not exceed the assignment's max marks. */
    @Transactional
    public AssignmentSubmissionResponse gradeSubmission(String email, Long submissionId, GradeSubmissionRequest request) {
        FacultyProfile faculty = getFacultyByEmail(email);
        AssignmentSubmission submission = assignmentSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        validateFacultyOwnsSection(faculty, submission.getAssignment().getSection());

        int maxMarks = submission.getAssignment().getMaxMarks() != null
                ? submission.getAssignment().getMaxMarks() : 10;
        if (request.getMarks().compareTo(BigDecimal.valueOf(maxMarks)) > 0) {
            throw new BadRequestException("Marks cannot exceed the maximum of " + maxMarks);
        }

        submission.setMarks(request.getMarks());
        submission.setFeedback(request.getFeedback());
        submission.setStatus(SubmissionStatus.GRADED);
        submission.setGradedAt(LocalDateTime.now());
        submission.setGradedBy(faculty.getUser());
        assignmentSubmissionRepository.save(submission);

        log.info("Faculty {} graded submission {} with {} marks", email, submissionId, request.getMarks());
        return mapSubmissionToResponse(submission);
    }

    // ==================== Assignment Marks ====================

    /**
     * All recorded assignment marks for a section, across every assignment in
     * that section. Used by the Assignment Marks "Recorded Marks" table.
     */
    public List<Map<String, Object>> getAssignmentMarksForSection(String email, Long sectionId) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionId));
        validateFacultyOwnsSection(faculty, section);

        List<Assignment> assignments = assignmentRepository.findBySectionIdOrderByCreatedAtDesc(sectionId);
        List<AssignmentSubmission> submissions = assignmentSubmissionRepository.findByAssignment_Section_Id(sectionId);
        List<Map<String, Object>> rows = new ArrayList<>();

        for (Assignment assignment : assignments) {
            int maxMarks = assignment.getMaxMarks() != null ? assignment.getMaxMarks() : 10;
            for (AssignmentSubmission submission : submissions) {
                if (!assignment.getId().equals(submission.getAssignment().getId())
                        || submission.getMarks() == null) {
                    continue;
                }
                StudentProfile student = submission.getStudent();
                User studentUser = student.getUser();
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("id", submission.getId());
                entry.put("assignmentId", assignment.getId());
                entry.put("assignmentTitle", assignment.getTitle());
                entry.put("maxMarks", maxMarks);
                entry.put("studentId", student.getId());
                entry.put("studentName", studentUser.getFirstName() + " " + studentUser.getLastName());
                entry.put("enrollmentNumber", student.getEnrollmentNumber());
                entry.put("marks", submission.getMarks());
                entry.put("status", submission.getStatus() != null ? submission.getStatus().name() : null);
                entry.put("submittedAt", submission.getSubmittedAt());
                entry.put("gradedAt", submission.getGradedAt());
                rows.add(entry);
            }
        }

        return rows;
    }

    /**
     * Marks grid for one assignment. Every student enrolled in the assignment's
     * section is returned, even when they have not submitted anything yet, so
     * faculty can enter or update marks for the whole class.
     */
    public Map<String, Object> getAssignmentMarksGrid(String email, Long assignmentId) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));
        validateFacultyOwnsSection(faculty, assignment.getSection());

        int maxMarks = assignment.getMaxMarks() != null ? assignment.getMaxMarks() : 10;
        List<Map<String, Object>> students = new ArrayList<>();

        for (Enrollment enrollment : enrollmentRepository.findBySectionId(assignment.getSection().getId())) {
            StudentProfile student = enrollment.getStudent();
            User studentUser = student.getUser();
            Optional<AssignmentSubmission> submission = assignmentSubmissionRepository
                    .findByAssignmentIdAndStudentId(assignmentId, student.getId());

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("studentId", student.getId());
            row.put("studentName", studentUser.getFirstName() + " " + studentUser.getLastName());
            row.put("enrollmentNumber", student.getEnrollmentNumber());
            row.put("submissionId", submission.map(AssignmentSubmission::getId).orElse(null));
            row.put("marks", submission.map(AssignmentSubmission::getMarks).orElse(null));
            row.put("status", submission
                    .map(s -> s.getStatus() != null ? s.getStatus().name() : null)
                    .orElse("NOT_SUBMITTED"));
            students.add(row);
        }

        students.sort(Comparator.comparing(row -> String.valueOf(row.get("enrollmentNumber"))));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("assignmentId", assignment.getId());
        result.put("assignmentTitle", assignment.getTitle());
        result.put("sectionId", assignment.getSection().getId());
        result.put("maxMarks", maxMarks);
        result.put("students", students);
        return result;
    }

    /**
     * Bulk create/update assignment marks for the students in an assignment's
     * section. A placeholder submission is created when the student has not
     * submitted a file, so marks can be recorded for everyone.
     */
    @Transactional
    public Map<String, Object> uploadAssignmentMarks(String email, Long assignmentId,
                                                     UploadAssignmentMarksRequest request) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));
        validateFacultyOwnsSection(faculty, assignment.getSection());

        int maxMarks = assignment.getMaxMarks() != null ? assignment.getMaxMarks() : 10;
        int created = 0;
        int updated = 0;

        for (UploadAssignmentMarksRequest.StudentAssignmentMarksEntry entry : request.getEntries()) {
            StudentProfile student = studentProfileRepository.findById(entry.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + entry.getStudentId()));

            if (!enrollmentRepository.existsByStudentIdAndSectionId(student.getId(), assignment.getSection().getId())) {
                throw new BadRequestException("Student " + entry.getStudentId()
                        + " is not enrolled in this assignment's section");
            }
            if (entry.getMarks().compareTo(BigDecimal.valueOf(maxMarks)) > 0) {
                throw new BadRequestException("Marks cannot exceed the maximum of " + maxMarks
                        + " for student " + entry.getStudentId());
            }

            Optional<AssignmentSubmission> existing = assignmentSubmissionRepository
                    .findByAssignmentIdAndStudentId(assignmentId, student.getId());

            AssignmentSubmission submission = existing.orElseGet(() -> AssignmentSubmission.builder()
                    .assignment(assignment)
                    .student(student)
                    .build());

            submission.setMarks(entry.getMarks());
            submission.setStatus(SubmissionStatus.GRADED);
            submission.setGradedAt(LocalDateTime.now());
            submission.setGradedBy(faculty.getUser());
            assignmentSubmissionRepository.save(submission);

            if (existing.isPresent()) {
                updated++;
            } else {
                created++;
            }
        }

        log.info("Faculty {} recorded assignment marks for assignment {}: {} created, {} updated",
                email, assignmentId, created, updated);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("assignmentId", assignmentId);
        result.put("created", created);
        result.put("updated", updated);
        result.put("message", "Assignment marks saved successfully");
        return result;
    }

    private AssignmentSubmissionResponse mapSubmissionToResponse(AssignmentSubmission s) {
        Assignment a = s.getAssignment();
        return AssignmentSubmissionResponse.builder()
                .id(s.getId())
                .assignmentId(a.getId())
                .assignmentTitle(a.getTitle())
                .sectionId(a.getSection().getId())
                .courseName(a.getSection().getCourse().getName())
                .courseCode(a.getSection().getCourse().getCode())
                .studentId(s.getStudent().getId())
                .studentName(s.getStudent().getUser().getFirstName() + " "
                        + s.getStudent().getUser().getLastName())
                .enrollmentNumber(s.getStudent().getEnrollmentNumber())
                .fileName(s.getFileName())
                .fileSize(s.getFileSize())
                .note(s.getNote())
                .late(s.isLate())
                .hasFile(s.getFilePath() != null && !s.getFilePath().isBlank())
                .status(s.getStatus() != null ? s.getStatus().name() : null)
                .marks(s.getMarks())
                .maxMarks(a.getMaxMarks() != null ? a.getMaxMarks() : 10)
                .feedback(s.getFeedback())
                .submittedAt(s.getSubmittedAt())
                .gradedAt(s.getGradedAt())
                .build();
    }

    // ==================== Course Materials ====================

    @Transactional
    public CourseMaterialResponse createCourseMaterial(String email, CreateCourseMaterialRequest request) {
        FacultyProfile faculty = getFacultyByEmail(email);
        User facultyUser = faculty.getUser();

        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + request.getSectionId()));
        validateFacultyOwnsSection(faculty, section);

        CourseMaterial material = CourseMaterial.builder()
                .section(section)
                .title(request.getTitle())
                .description(request.getDescription())
                .materialType(request.getMaterialType().toUpperCase())
                .targetYear(validateTargetYear(request.getTargetYear()))
                .fileName(request.getFileName())
                .uploadedBy(facultyUser)
                .build();

        material = courseMaterialRepository.save(material);

        notifyDepartmentYear(section.getCourse() != null ? section.getCourse().getDepartment() : faculty.getDepartment(),
                material.getTargetYear(),
                "New study material: " + material.getTitle(),
                "New study material was shared for " + section.getCourse().getName() + ".",
                NotificationCategory.MATERIAL);

        log.info("Faculty {} created course material '{}' for section {}", email, request.getTitle(), section.getId());

        return mapMaterialToResponse(material);
    }

    public List<CourseMaterialResponse> getCourseMaterials(String email, Long sectionId) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionId));
        validateFacultyOwnsSection(faculty, section);

        return courseMaterialRepository.findBySectionIdOrderByCreatedAtDesc(sectionId)
                .stream()
                .map(this::mapMaterialToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Phase 8: Upload the actual file for a course material to S3.
     * S3 key: {sectionId}/{materialId}/{uuid}_{originalFilename}
     */
    @Transactional
    public CourseMaterialResponse uploadMaterialFile(String email, Long materialId, MultipartFile file) throws IOException {
        FacultyProfile faculty = getFacultyByEmail(email);
        CourseMaterial material = courseMaterialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Course material not found: " + materialId));
        validateFacultyOwnsSection(faculty, material.getSection());

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File must not be empty.");
        }

        String uniqueName = java.util.UUID.randomUUID() + "_" + sanitizeFilename(file.getOriginalFilename());
        String s3Key = material.getSection().getId() + "/" + materialId + "/" + uniqueName;

        // Replace existing file in S3 if one is already stored
        if (material.getFilePath() != null && !material.getFilePath().isBlank()) {
            s3StorageService.delete(materialBucket, material.getFilePath());
        }

        s3StorageService.upload(materialBucket, s3Key, file.getInputStream(),
                file.getSize(), S3StorageService.detectContentType(file.getOriginalFilename()));

        material.setFilePath(s3Key);
        material.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : uniqueName);
        courseMaterialRepository.save(material);

        log.info("Faculty {} uploaded course material to S3: s3://{}/{}", email, materialBucket, s3Key);
        return mapMaterialToResponse(material);
    }

    /**
     * Phase 8: Download the file for a course material from S3.
     */
    public byte[] downloadMaterialFile(String email, Long materialId) throws IOException {
        CourseMaterial material = courseMaterialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Course material not found: " + materialId));
        if (material.getFilePath() == null || material.getFilePath().isBlank()) {
            throw new BadRequestException("No file attached to this course material.");
        }
        return s3StorageService.download(materialBucket, material.getFilePath());
    }

    // ==================== Question Papers ====================

    @Transactional
    public QuestionPaperResponse uploadQuestionPaper(String email, CreateQuestionPaperRequest request) {
        FacultyProfile faculty = getFacultyByEmail(email);
        User facultyUser = faculty.getUser();
        Department department = requireFacultyDepartment(faculty);

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseId()));
        validateCourseBelongsToDepartment(course, department);

        QuestionPaper qp = QuestionPaper.builder()
                .course(course)
                .department(department)
                .examType(request.getExamType().toUpperCase())
                .year(request.getYear())
                .semesterNumber(request.getSemesterNumber())
                .targetYear(validateTargetYear(request.getTargetYear()))
                .fileName(request.getFileName())
                .status("APPROVED")
                .uploadedBy(facultyUser)
                .build();

        qp = questionPaperRepository.save(qp);

        notifyDepartmentYear(department, qp.getTargetYear(),
                "New question paper: " + course.getName(),
                "A " + qp.getExamType().replace('_', ' ').toLowerCase(Locale.ROOT)
                        + " question paper was uploaded for " + course.getName() + ".",
                NotificationCategory.QUESTION_PAPER);

        log.info("Faculty {} uploaded question paper for {} ({})", email, course.getName(), request.getExamType());

        return mapQuestionPaperToResponse(qp);
    }

    public List<QuestionPaperResponse> getMyQuestionPapers(String email) {
        User user = getUserByEmail(email);
        return questionPaperRepository.findByUploadedByIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapQuestionPaperToResponse)
                .collect(Collectors.toList());
    }

    // ==================== Notices ====================

    @Transactional
    public Map<String, Object> draftNotice(String email, CreateNoticeRequest request) {

        NotificationType type;
        try {
            type = request.getType() != null ?
                    NotificationType.valueOf(request.getType().toUpperCase()) :
                    NotificationType.GENERAL;
        } catch (IllegalArgumentException e) {
            type = NotificationType.GENERAL;
        }

        // A faculty notice is always scoped to the faculty's own department.
        FacultyProfile faculty = getFacultyByEmail(email);
        Department dept = requireFacultyDepartment(faculty);
        Integer targetYear = validateTargetYear(request.getTargetYear());

        List<StudentProfile> targetStudents = studentProfileRepository.findByDepartmentId(dept.getId()).stream()
                .filter(s -> Objects.equals(AcademicYearUtils.fromSemester(s.getSemester()), targetYear))
                .collect(Collectors.toList());

        if (targetStudents.isEmpty()) {
            throw new BadRequestException("No students are enrolled in " + AcademicYearUtils.label(targetYear)
                    + " for your department.");
        }

        int sent = 0;
        for (StudentProfile student : targetStudents) {
            Notification notification = Notification.builder()
                    .user(student.getUser())
                    .title(request.getTitle())
                    .message(request.getMessage())
                    .type(type)
                    .build();
            notificationRepository.save(notification);
            sent++;
        }

        log.info("Faculty {} sent notice '{}' to {} {} students in department {}",
                email, request.getTitle(), sent, AcademicYearUtils.label(targetYear), dept.getCode());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("title", request.getTitle());
        result.put("recipientCount", sent);
        result.put("departmentId", dept.getId());
        result.put("departmentName", dept.getName());
        result.put("targetYear", targetYear);
        result.put("message", "Notice sent successfully to " + sent + " students in "
                + AcademicYearUtils.label(targetYear) + " of " + dept.getName());
        return result;
    }

    private void notifyDepartmentYear(Department department, Integer targetYear,
                                      String title, String message, NotificationCategory category) {
        if (department == null || targetYear == null) return;
        List<StudentProfile> students = studentProfileRepository.findByDepartmentId(department.getId()).stream()
                .filter(s -> Objects.equals(AcademicYearUtils.fromSemester(s.getSemester()), targetYear))
                .collect(Collectors.toList());
        for (StudentProfile student : students) {
            notificationRepository.save(Notification.builder()
                    .user(student.getUser())
                    .title(title)
                    .message(message)
                    .type(NotificationType.ACADEMIC)
                    .category(category)
                    .build());
        }
    }

    // ==================== Notifications ====================

    public List<NotificationResponse> getNotifications(String email) {
        User user = getUserByEmail(email);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(n -> NotificationResponse.builder()
                        .id(n.getId())
                        .title(n.getTitle())
                        .message(n.getMessage())
                        .type(n.getType().name())
                        .category(n.getCategory() != null ? n.getCategory().name() : NotificationCategory.NOTICE.name())
                        .read(n.isRead())
                        .createdAt(n.getCreatedAt())
                        .attachmentFileName(n.getAttachmentFileName())
                        .hasAttachment(n.getAttachmentPath() != null && !n.getAttachmentPath().isBlank())
                        .build())
                .collect(Collectors.toList());
    }

    public Map<String, Long> getUnreadCounts(String email) {
        User user = getUserByEmail(email);
        Map<String, Long> counts = new LinkedHashMap<>();
        for (NotificationCategory category : NotificationCategory.values()) {
            counts.put(category.name(),
                    notificationRepository.countByUserIdAndCategoryAndIsReadFalse(user.getId(), category));
        }
        return counts;
    }

    @Transactional
    public void markCategoryRead(String email, String category) {
        User user = getUserByEmail(email);
        NotificationCategory parsed;
        try {
            parsed = NotificationCategory.valueOf(category.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unknown notification category: " + category);
        }
        notificationRepository.markCategoryRead(user.getId(), parsed);
    }

    private Integer validateTargetYear(Integer targetYear) {
        if (targetYear == null) {
            throw new BadRequestException("Please select a target year.");
        }
        if (targetYear < 1 || targetYear > 4) {
            throw new BadRequestException("Target year must be between I Year and Final Year.");
        }
        return targetYear;
    }

    // ==================== Faculty Subject Assignment ====================

    @Transactional
    public FacultySubjectAssignmentResponse assignSubjectToSelf(String email, AssignFacultySubjectRequest request) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Department department = faculty.getDepartment();

        String courseName = request.getCourseName() != null ? request.getCourseName().trim() : "";
        if (courseName.isEmpty()) {
            throw new BadRequestException("Course name is required");
        }

        Integer credits = request.getCredits() != null ? request.getCredits() : 4;
        if (credits < 1 || credits > 12) {
            throw new BadRequestException("Credits must be between 1 and 12");
        }

        // Faculty may type a subject code manually alongside the credits. When
        // omitted, a code is generated from the department and subject name.
        String requestedCode = request.getCourseCode() != null ? request.getCourseCode().trim() : "";
        if (!requestedCode.isBlank() && !requestedCode.matches("[A-Za-z0-9_\\-]+")) {
            throw new BadRequestException("Subject code may contain only letters, numbers, '-' and '_'.");
        }
        String finalCode = requestedCode.isBlank() ? null : requestedCode.toUpperCase(Locale.ROOT);

        Optional<Course> existingCourse;
        if (finalCode != null) {
            Optional<Course> byCode = courseRepository.findByCode(finalCode);
            if (byCode.isPresent() && (byCode.get().getDepartment() == null
                    || !Objects.equals(byCode.get().getDepartment().getId(), department.getId()))) {
                throw new BadRequestException("Subject code already in use: " + finalCode);
            }
            existingCourse = byCode;
        } else {
            existingCourse = courseRepository.findByDepartmentId(department.getId()).stream()
                    .filter(c -> c.getName().equalsIgnoreCase(courseName))
                    .findFirst();
        }

        Course course;
        if (existingCourse.isPresent()) {
            course = existingCourse.get();
            // The assigning faculty can correct the credit value for the subject.
            if (!Objects.equals(course.getCredits(), credits)) {
                course.setCredits(credits);
                course = courseRepository.save(course);
            }
        } else {
            course = courseRepository.save(Course.builder()
                    .name(courseName)
                    .code(finalCode != null ? finalCode : generateCourseCode(department, courseName))
                    .credits(credits)
                    .department(department)
                    .description(courseName + " (added by faculty)")
                    .build());
        }

        Semester semester = semesterRepository.findById(request.getSemesterId())
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found: " + request.getSemesterId()));

        Integer year = AcademicYearUtils.fromSemester(semester.getNumber());
        if (year == null) {
            throw new BadRequestException("Semester number must be between 1 and 8");
        }

        // Check if already assigned
        Optional<FacultySubjectAssignment> existing = facultySubjectAssignmentRepository
                .findByFacultyIdAndCourseIdAndSemesterId(faculty.getId(), course.getId(), semester.getId());

        FacultySubjectAssignment assignment;
        if (existing.isPresent()) {
            assignment = existing.get();
            assignment.setActive(true);
            assignment = facultySubjectAssignmentRepository.save(assignment);
        } else {
            assignment = FacultySubjectAssignment.builder()
                    .faculty(faculty)
                    .course(course)
                    .semester(semester)
                    .isActive(true)
                    .build();
            assignment = facultySubjectAssignmentRepository.save(assignment);
        }

        // Claim the sections that belong to this course + semester so the faculty
        // can immediately manage attendance, marks, assignments and materials.
        List<Section> assignedSections = claimSectionsForFaculty(faculty, course, semester);
        if (assignedSections.isEmpty()) {
            throw new BadRequestException("No section is available for this subject and semester.");
        }

        int studentCount;
        if (request.getStudentIds() != null && !request.getStudentIds().isEmpty()) {
            // Backlog mode: enroll only the particular students chosen from a department.
            studentCount = enrollSelectedStudents(
                    request.getStudentIds(), request.getDepartmentId(), assignedSections);
        } else {
            Department targetDepartment = department;
            if (request.getDepartmentId() != null) {
                targetDepartment = departmentRepository.findById(request.getDepartmentId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Department not found: " + request.getDepartmentId()));
            }
            studentCount = loadYearStudentsIntoOwnedSections(
                    targetDepartment, year, assignedSections, request.getSectionFilter());
        }

        log.info("Faculty {} assigned to course {} for semester {} ({}): {} students in {} section(s)",
                email, course.getName(), semester.getName(), AcademicYearUtils.label(year),
                studentCount, assignedSections.size());

        FacultySubjectAssignmentResponse response = mapSubjectAssignmentToResponse(assignment);
        response.setSectionCount(assignedSections.size());
        response.setStudentCount(studentCount);
        return response;
    }

    /**
     * Repairs older subject assignments that were created before year-based
     * enrollment was introduced. Called once after startup; safe to repeat.
     */
    @Transactional
    public void backfillStudentEnrollmentsForActiveAssignments() {
        List<FacultySubjectAssignment> assignments = facultySubjectAssignmentRepository.findAll().stream()
                .filter(FacultySubjectAssignment::isActive)
                .collect(Collectors.toList());

        int synchronizedAssignments = 0;
        for (FacultySubjectAssignment assignment : assignments) {
            FacultyProfile faculty = assignment.getFaculty();
            Integer year = AcademicYearUtils.fromSemester(assignment.getSemester().getNumber());
            if (faculty.getDepartment() == null || year == null) {
                continue;
            }

            List<Section> ownedSections = claimSectionsForFaculty(
                    faculty, assignment.getCourse(), assignment.getSemester());
            if (ownedSections.isEmpty()) {
                continue;
            }

            loadYearStudentsIntoOwnedSections(faculty.getDepartment(), year, ownedSections, null);
            synchronizedAssignments++;
        }

        if (synchronizedAssignments > 0) {
            log.info("Synchronized year students for {} active faculty subject assignment(s)",
                    synchronizedAssignments);
        }
    }

    @Transactional
    public void removeSubjectAssignment(String email, Long assignmentId) {
        FacultyProfile faculty = getFacultyByEmail(email);
        FacultySubjectAssignment assignment = facultySubjectAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        if (!assignment.getFaculty().getId().equals(faculty.getId())) {
            throw new BadRequestException("You are not authorized to remove this assignment");
        }

        assignment.setActive(false);
        facultySubjectAssignmentRepository.save(assignment);

        // Release the sections this faculty was teaching for that course + semester
        sectionRepository.findByCourseIdAndSemesterId(
                        assignment.getCourse().getId(), assignment.getSemester().getId())
                .stream()
                .filter(section -> section.getFaculty() != null
                        && section.getFaculty().getId().equals(faculty.getId()))
                .forEach(section -> {
                    section.setFaculty(null);
                    sectionRepository.save(section);
                });

        log.info("Faculty {} removed subject assignment {}", email, assignmentId);
    }

    public List<FacultySubjectAssignmentResponse> getMySubjectAssignments(String email) {
        FacultyProfile faculty = getFacultyByEmail(email);
        return facultySubjectAssignmentRepository.findByFacultyIdAndIsActiveTrue(faculty.getId())
                .stream()
                .map(this::mapSubjectAssignmentToResponse)
                .collect(Collectors.toList());
    }

    public List<CourseResponse> getAvailableCoursesForDepartment(String email) {
        FacultyProfile faculty = getFacultyByEmail(email);
        return courseRepository.findByDepartmentId(faculty.getDepartment().getId())
                .stream()
                .map(this::mapCourseToResponse)
                .collect(Collectors.toList());
    }

    public List<SemesterResponse> getAllSemesters() {
        return semesterRepository.findAllByOrderByNumberAsc()
                .stream()
                .map(this::mapSemesterToResponse)
                .collect(Collectors.toList());
    }

    /**
     * All students across every department (lightweight rows) for the open
     * elective / backlog cross-department student picker.
     */
    @Transactional(readOnly = true)
    public List<FacultyAllStudentResponse> getAllStudentsForFaculty(String email) {
        FacultyProfile faculty = getFacultyByEmail(email);
        return studentProfileRepository.findAll().stream()
                .map(student -> {
                    Long deptId = student.getDepartment() != null ? student.getDepartment().getId() : null;
                    String deptName = student.getDepartment() != null
                            ? student.getDepartment().getName() : "N/A";
                    Integer year = AcademicYearUtils.fromSemester(student.getSemester());
                    String name = student.getUser() != null
                            ? (student.getUser().getFirstName() + " " + student.getUser().getLastName()).trim()
                            : student.getEnrollmentNumber();
                    return FacultyAllStudentResponse.builder()
                            .studentId(student.getId())
                            .name(name)
                            .enrollmentNumber(student.getEnrollmentNumber())
                            .departmentId(deptId)
                            .departmentName(deptName)
                            .section(student.getSection())
                            .year(year)
                            .semester(student.getSemester())
                            .build();
                })
                .sorted(Comparator.comparing(FacultyAllStudentResponse::getDepartmentName,
                        Comparator.nullsLast(String::compareTo))
                        .thenComparing(FacultyAllStudentResponse::getEnrollmentNumber,
                                Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());
    }

    /**
     * Creates an open-elective subject and explicitly enrolls particular
     * students from the selected department into the faculty's section.
     */
    @Transactional
    public FacultySubjectAssignmentResponse createOpenElective(String email, CreateOpenElectiveRequest request) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Department department = faculty.getDepartment();

        String courseName = request.getCourseName() != null ? request.getCourseName().trim() : "";
        if (courseName.isEmpty()) {
            throw new BadRequestException("Course name is required");
        }
        Integer credits = request.getCredits() != null ? request.getCredits() : 4;
        if (credits < 1 || credits > 12) {
            throw new BadRequestException("Credits must be between 1 and 12");
        }
        if (request.getStudentIds() == null || request.getStudentIds().isEmpty()) {
            throw new BadRequestException("Select at least one student");
        }
        if (request.getDepartmentIds() == null || request.getDepartmentIds().isEmpty()) {
            throw new BadRequestException("Select at least one department");
        }
        Set<Long> departmentIds = new HashSet<>();
        for (Long id : request.getDepartmentIds()) {
            departmentRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
            departmentIds.add(id);
        }

        // Optional manual subject code, same rules as a normal subject assignment.
        String requestedCode = request.getCourseCode() != null ? request.getCourseCode().trim() : "";
        if (!requestedCode.isBlank() && !requestedCode.matches("[A-Za-z0-9_\\-]+")) {
            throw new BadRequestException("Subject code may contain only letters, numbers, '-' and '_'.");
        }
        String finalCode = requestedCode.isBlank() ? null : requestedCode.toUpperCase(Locale.ROOT);

        Optional<Course> existingCourse;
        if (finalCode != null) {
            Optional<Course> byCode = courseRepository.findByCode(finalCode);
            if (byCode.isPresent() && (byCode.get().getDepartment() == null
                    || !Objects.equals(byCode.get().getDepartment().getId(), department.getId()))) {
                throw new BadRequestException("Subject code already in use: " + finalCode);
            }
            existingCourse = byCode;
        } else {
            existingCourse = courseRepository.findByDepartmentId(department.getId()).stream()
                    .filter(c -> c.getName().equalsIgnoreCase(courseName))
                    .findFirst();
        }

        Course course;
        if (existingCourse.isPresent()) {
            course = existingCourse.get();
            if (!Objects.equals(course.getCredits(), credits)) {
                course.setCredits(credits);
                course = courseRepository.save(course);
            }
        } else {
            course = courseRepository.save(Course.builder()
                    .name(courseName)
                    .code(finalCode != null ? finalCode : generateCourseCode(department, courseName))
                    .credits(credits)
                    .department(department)
                    .description(courseName + " (open elective)")
                    .build());
        }

        Semester semester = semesterRepository.findById(request.getSemesterId())
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found: " + request.getSemesterId()));

        Optional<FacultySubjectAssignment> existing = facultySubjectAssignmentRepository
                .findByFacultyIdAndCourseIdAndSemesterId(faculty.getId(), course.getId(), semester.getId());
        FacultySubjectAssignment assignment;
        if (existing.isPresent()) {
            assignment = existing.get();
            assignment.setActive(true);
            assignment = facultySubjectAssignmentRepository.save(assignment);
        } else {
            assignment = facultySubjectAssignmentRepository.save(FacultySubjectAssignment.builder()
                    .faculty(faculty)
                    .course(course)
                    .semester(semester)
                    .isActive(true)
                    .build());
        }

        // Open electives have no visible sections. A single hidden section is used
        // internally only so attendance/enrollment records can still be stored.
        final Course finalCourse = course;
        Section section = sectionRepository.findByCourseIdAndSemesterId(finalCourse.getId(), semester.getId()).stream()
                .filter(sec -> sec.isHidden() && "OPEN ELECTIVE".equalsIgnoreCase(sec.getName()))
                .findFirst()
                .orElseGet(() -> sectionRepository.save(Section.builder()
                        .name("OPEN ELECTIVE")
                        .course(finalCourse)
                        .semester(semester)
                        .faculty(faculty)
                        .hidden(true)
                        .maxCapacity(500)
                        .build()));
        if (section.getFaculty() == null) {
            section.setFaculty(faculty);
            section = sectionRepository.save(section);
        }

        int enrolled = 0;
        for (Long studentId : request.getStudentIds()) {
            StudentProfile student = studentProfileRepository.findById(studentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));
            if (student.getDepartment() == null || !departmentIds.contains(student.getDepartment().getId())) {
                throw new BadRequestException("Student " + student.getEnrollmentNumber()
                        + " is not from one of the selected departments.");
            }
            if (!enrollmentRepository.existsByStudentIdAndSectionId(student.getId(), section.getId())) {
                enrollmentRepository.save(Enrollment.builder()
                        .student(student)
                        .section(section)
                        .status(EnrollmentStatus.ACTIVE)
                        .build());
            }
            enrolled++;
        }

        log.info("Faculty {} created open elective {} for semester {} with {} students from {} department(s)",
                email, course.getName(), semester.getName(), enrolled, departmentIds.size());

        FacultySubjectAssignmentResponse response = mapSubjectAssignmentToResponse(assignment);
        response.setSectionCount(0);
        response.setStudentCount(enrolled);
        return response;
    }

private List<Section> claimSectionsForFaculty(FacultyProfile faculty, Course course, Semester semester) {
        List<Section> sections = sectionRepository.findByCourseIdAndSemesterId(course.getId(), semester.getId());

        List<Section> unassigned = sections.stream()
                .filter(s -> s.getFaculty() == null)
                .collect(Collectors.toList());

        if (!unassigned.isEmpty()) {
            unassigned.forEach(section -> {
                section.setFaculty(faculty);
                sectionRepository.save(section);
            });
        } else if (sections.stream().noneMatch(s -> isOwnedBy(s, faculty))) {
            // Every existing section is already taken by another faculty member â€”
            // create a fresh pair of sections for this faculty.
            int created = 0;
            for (String name : new String[]{"A", "B", "C", "D", "E", "F", "G", "H"}) {
                if (created >= 2) break;
                if (sectionRepository.existsByNameAndCourseIdAndSemesterId(name, course.getId(), semester.getId())) {
                    continue;
                }
                sectionRepository.save(Section.builder()
                        .name(name)
                        .course(course)
                        .semester(semester)
                        .faculty(faculty)
                        .maxCapacity(60)
                        .build());
                created++;
            }
        }

        return sectionRepository.findByCourseIdAndSemesterId(course.getId(), semester.getId()).stream()
                .filter(section -> isOwnedBy(section, faculty))
                .collect(Collectors.toList());
    }

    private boolean isOwnedBy(Section section, FacultyProfile faculty) {
        return section.getFaculty() != null && section.getFaculty().getId().equals(faculty.getId());
    }

    /**
     * Ensures every student in the semester's academic year and optional section
     * (A, B, C) is enrolled in one of the faculty's sections.
     */
    private int loadYearStudentsIntoOwnedSections(Department department, Integer year, List<Section> sections,
            String sectionFilter) {
        if (sections.isEmpty()) {
            return 0;
        }

        List<StudentProfile> yearStudents = studentProfileRepository.findByDepartmentId(department.getId()).stream()
                .filter(student -> Objects.equals(AcademicYearUtils.fromSemester(student.getSemester()), year))
                .collect(Collectors.toList());

        Map<Long, Long> sectionCounts = new HashMap<>();
        sections.forEach(section ->
                sectionCounts.put(section.getId(), enrollmentRepository.countBySectionId(section.getId())));

        for (StudentProfile student : yearStudents) {
            // Section is the primary filter; division is accepted as an alias
            // because some colleges use the two terms interchangeably.
            if (sectionFilter != null && !sectionFilter.isBlank()) {
                String studentSection = student.getSection();
                String studentDivision = student.getDivision();
                boolean matches = (studentSection != null && studentSection.equalsIgnoreCase(sectionFilter))
                        || (studentDivision != null && studentDivision.equalsIgnoreCase(sectionFilter));
                if (!matches) {
                    continue;
                }
            }
            enrollIfNeeded(student, sections, sectionCounts);
        }

        return sections.stream()
                .mapToInt(section -> (int) enrollmentRepository.countBySectionId(section.getId()))
                .sum();
    }

    /** Enroll only the particular (e.g. backlog) students chosen from a department. */
    private int enrollSelectedStudents(List<Long> studentIds, Long departmentId, List<Section> sections) {
        Map<Long, Long> sectionCounts = new HashMap<>();
        sections.forEach(section ->
                sectionCounts.put(section.getId(), enrollmentRepository.countBySectionId(section.getId())));

        int enrolled = 0;
        for (Long studentId : studentIds) {
            StudentProfile student = studentProfileRepository.findById(studentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));
            if (departmentId != null && (student.getDepartment() == null
                    || !Objects.equals(student.getDepartment().getId(), departmentId))) {
                throw new BadRequestException(
                        "Student " + student.getEnrollmentNumber() + " is not from the selected department.");
            }
            if (enrollIfNeeded(student, sections, sectionCounts)) {
                enrolled++;
            }
        }
        return enrolled;
    }

    /** Enrolls a student into the matching section (or the least-filled one). */
    private boolean enrollIfNeeded(StudentProfile student, List<Section> sections, Map<Long, Long> sectionCounts) {
        boolean alreadyEnrolled = sections.stream()
                .anyMatch(section -> enrollmentRepository.existsByStudentIdAndSectionId(
                        student.getId(), section.getId()));
        if (alreadyEnrolled) {
            return false;
        }

        Section target = sections.stream()
                .filter(section -> student.getSection() != null
                        && student.getSection().equalsIgnoreCase(section.getName()))
                .findFirst()
                .orElseGet(() -> sections.stream()
                        .min(Comparator.comparingLong(
                                section -> sectionCounts.getOrDefault(section.getId(), 0L)))
                        .orElse(sections.get(0)));

        enrollmentRepository.save(Enrollment.builder()
                .student(student)
                .section(target)
                .status(EnrollmentStatus.ACTIVE)
                .build());
        sectionCounts.merge(target.getId(), 1L, Long::sum);
        return true;
    }

    private String generateCourseCode(Department department, String courseName) {
        String deptCode = (department.getCode() != null && !department.getCode().isBlank())
                ? department.getCode().toUpperCase()
                : "GEN";
        String letters = courseName.replaceAll("[^A-Za-z]", "").toUpperCase();
        if (letters.length() < 3) {
            letters = (letters + "SUB").substring(0, 3);
        }
        String base = deptCode + letters.substring(0, 3);
        String code = base;
        int suffix = 1;
        while (courseRepository.existsByCode(code)) {
            code = base + suffix++;
        }
        return code;
    }

    private CourseResponse mapCourseToResponse(Course c) {
        return CourseResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .code(c.getCode())
                .credits(c.getCredits())
                .departmentId(c.getDepartment() != null ? c.getDepartment().getId() : null)
                .departmentName(c.getDepartment() != null ? c.getDepartment().getName() : null)
                .description(c.getDescription())
                .createdAt(c.getCreatedAt())
                .build();
    }

    private SemesterResponse mapSemesterToResponse(Semester s) {
        return SemesterResponse.builder()
                .id(s.getId())
                .name(s.getName())
                .number(s.getNumber())
                .academicYear(s.getAcademicYear())
                .startDate(s.getStartDate())
                .endDate(s.getEndDate())
                .active(s.isActive())
                .createdAt(s.getCreatedAt())
                .build();
    }

    // ==================== Question Papers with File Upload ====================

    @Transactional
    public QuestionPaperResponse uploadQuestionPaperWithFile(String email, CreateQuestionPaperRequest request, MultipartFile file) throws IOException {
        FacultyProfile faculty = getFacultyByEmail(email);
        User facultyUser = faculty.getUser();
        Department department = requireFacultyDepartment(faculty);

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseId()));
        validateCourseBelongsToDepartment(course, department);

        QuestionPaper qp = QuestionPaper.builder()
                .course(course)
                .department(department)
                .examType(request.getExamType().toUpperCase())
                .year(request.getYear())
                .semesterNumber(request.getSemesterNumber())
                .targetYear(validateTargetYear(request.getTargetYear()))
                .fileName(request.getFileName())
                .status("APPROVED")
                .uploadedBy(facultyUser)
                .build();

        qp = questionPaperRepository.save(qp);

        // Upload file to S3 if provided
        if (file != null && !file.isEmpty()) {
            String uniqueName = java.util.UUID.randomUUID() + "_" + sanitizeFilename(file.getOriginalFilename());
            String s3Key = course.getId() + "/" + qp.getId() + "/" + uniqueName;

            s3StorageService.upload(questionPaperBucket, s3Key, file.getInputStream(),
                    file.getSize(), S3StorageService.detectContentType(file.getOriginalFilename()));

            qp.setFilePath(s3Key);
            qp.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : uniqueName);
            qp = questionPaperRepository.save(qp);
        }

        notifyDepartmentYear(department, qp.getTargetYear(),
                "New question paper: " + course.getName(),
                "A " + qp.getExamType().replace('_', ' ').toLowerCase(Locale.ROOT)
                        + " question paper was uploaded for " + course.getName() + ".",
                NotificationCategory.QUESTION_PAPER);

        log.info("Faculty {} uploaded question paper for {} ({})", email, course.getName(), request.getExamType());

        return mapQuestionPaperToResponse(qp);
    }

    public byte[] downloadQuestionPaperFile(String email, Long questionPaperId) throws IOException {
        User user = getUserByEmail(email);
        QuestionPaper qp = questionPaperRepository.findById(questionPaperId)
                .orElseThrow(() -> new ResourceNotFoundException("Question paper not found: " + questionPaperId));

        if (!qp.getUploadedBy().getId().equals(user.getId())) {
            throw new BadRequestException("You are not authorized to download this question paper");
        }

        if (qp.getFilePath() == null || qp.getFilePath().isBlank()) {
            throw new BadRequestException("No file attached to this question paper");
        }
        return s3StorageService.download(questionPaperBucket, qp.getFilePath());
    }

    // ==================== Course Materials with File Upload ====================

    @Transactional
    public CourseMaterialResponse createCourseMaterialWithFile(String email, CreateCourseMaterialRequest request, MultipartFile file) throws IOException {
        FacultyProfile faculty = getFacultyByEmail(email);
        User facultyUser = faculty.getUser();

        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + request.getSectionId()));
        validateFacultyOwnsSection(faculty, section);

        CourseMaterial material = CourseMaterial.builder()
                .section(section)
                .title(request.getTitle())
                .description(request.getDescription())
                .materialType(request.getMaterialType().toUpperCase())
                .targetYear(validateTargetYear(request.getTargetYear()))
                .fileName(request.getFileName())
                .uploadedBy(facultyUser)
                .build();

        material = courseMaterialRepository.save(material);

        // Upload file to S3 if provided
        if (file != null && !file.isEmpty()) {
            String uniqueName = java.util.UUID.randomUUID() + "_" + sanitizeFilename(file.getOriginalFilename());
            String s3Key = section.getId() + "/" + material.getId() + "/" + uniqueName;

            // Replace existing file in S3 if one is already stored
            if (material.getFilePath() != null && !material.getFilePath().isBlank()) {
                s3StorageService.delete(materialBucket, material.getFilePath());
            }

            s3StorageService.upload(materialBucket, s3Key, file.getInputStream(),
                    file.getSize(), S3StorageService.detectContentType(file.getOriginalFilename()));

            material.setFilePath(s3Key);
            material.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : uniqueName);
            courseMaterialRepository.save(material);
        }

        log.info("Faculty {} created course material '{}' for section {}", email, request.getTitle(), section.getId());

        return mapMaterialToResponse(material);
    }

    // ==================== Helpers ====================

    private FacultyProfile getFacultyByEmail(String email) {
        User user = getUserByEmail(email);
        return facultyProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Faculty profile not found for user: " + email));
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private void validateFacultyOwnsSection(FacultyProfile faculty, Section section) {
        if (section.getFaculty() == null || !section.getFaculty().getId().equals(faculty.getId())) {
            throw new BadRequestException("You are not assigned to section: " + section.getName()
                    + " (" + section.getCourse().getName() + ")");
        }
    }

    private Department requireFacultyDepartment(FacultyProfile faculty) {
        if (faculty.getDepartment() == null) {
            throw new BadRequestException("Your faculty account is not assigned to a department.");
        }
        return faculty.getDepartment();
    }

    private void validateCourseBelongsToDepartment(Course course, Department department) {
        if (course.getDepartment() == null
                || !Objects.equals(course.getDepartment().getId(), department.getId())) {
            throw new BadRequestException("You can only upload resources for courses in your department.");
        }
    }

    private String sanitizeFilename(String name) {
        if (name == null) return "file";
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private AssignmentResponse mapAssignmentToResponse(Assignment a) {
        return AssignmentResponse.builder()
                .id(a.getId())
                .sectionId(a.getSection().getId())
                .courseName(a.getSection().getCourse().getName())
                .courseCode(a.getSection().getCourse().getCode())
                .title(a.getTitle())
                .description(a.getDescription())
                .dueDate(a.getDueDate())
                .fileName(a.getFileName())
                .hasFile(a.getFilePath() != null && !a.getFilePath().isBlank())
                .createdAt(a.getCreatedAt())
                .maxMarks(a.getMaxMarks() != null ? a.getMaxMarks() : 10)
                .targetYear(a.getTargetYear())
                .submissionCount(assignmentSubmissionRepository.countByAssignmentId(a.getId()))
                .gradedCount(assignmentSubmissionRepository.countByAssignmentIdAndStatus(
                        a.getId(), SubmissionStatus.GRADED))
                .build();
    }

    private CourseMaterialResponse mapMaterialToResponse(CourseMaterial m) {
        return CourseMaterialResponse.builder()
                .id(m.getId())
                .sectionId(m.getSection().getId())
                .courseName(m.getSection().getCourse().getName())
                .courseCode(m.getSection().getCourse().getCode())
                .title(m.getTitle())
                .description(m.getDescription())
                .materialType(m.getMaterialType())
                .fileName(m.getFileName())
                .hasFile(m.getFilePath() != null && !m.getFilePath().isBlank())
                .targetYear(m.getTargetYear())
                .createdAt(m.getCreatedAt())
                .build();
    }

    private QuestionPaperResponse mapQuestionPaperToResponse(QuestionPaper qp) {
        return questionPaperService.mapToResponse(qp);
    }

    private FacultySubjectAssignmentResponse mapSubjectAssignmentToResponse(FacultySubjectAssignment a) {
        return FacultySubjectAssignmentResponse.builder()
                .id(a.getId())
                .facultyId(a.getFaculty().getId())
                .facultyName(a.getFaculty().getUser().getFirstName() + " " + a.getFaculty().getUser().getLastName())
                .courseId(a.getCourse().getId())
                .courseName(a.getCourse().getName())
                .courseCode(a.getCourse().getCode())
                .credits(a.getCourse().getCredits())
                .semesterId(a.getSemester().getId())
                .semesterName(a.getSemester().getName())
                .semesterNumber(a.getSemester().getNumber())
                .year(AcademicYearUtils.fromSemester(a.getSemester().getNumber()))
                .yearLabel(AcademicYearUtils.label(AcademicYearUtils.fromSemester(a.getSemester().getNumber())))
                .isActive(a.isActive())
                .createdAt(a.getCreatedAt().toString())
                .build();
    }
}

