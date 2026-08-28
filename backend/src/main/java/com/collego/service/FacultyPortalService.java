package com.collego.service;

import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FacultyPortalService {

    private final UserRepository userRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final SectionRepository sectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final InternalMarksRepository internalMarksRepository;
    private final SemesterMarksRepository semesterMarksRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final AssignmentRepository assignmentRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final QuestionPaperRepository questionPaperRepository;
    private final NotificationRepository notificationRepository;
    private final CourseRepository courseRepository;
    private final DepartmentRepository departmentRepository;
    private final QuestionPaperService questionPaperService;

    // ==================== Sections ====================

    public List<FacultySectionResponse> getAssignedSections(String email) {
        FacultyProfile faculty = getFacultyByEmail(email);
        List<Section> sections = sectionRepository.findByFacultyId(faculty.getId());

        return sections.stream().map(section -> {
            long enrolledCount = enrollmentRepository.countBySectionId(section.getId());

            return FacultySectionResponse.builder()
                    .sectionId(section.getId())
                    .sectionName(section.getName())
                    .courseId(section.getCourse().getId())
                    .courseName(section.getCourse().getName())
                    .courseCode(section.getCourse().getCode())
                    .credits(section.getCourse().getCredits())
                    .semesterId(section.getSemester().getId())
                    .semesterName(section.getSemester().getName())
                    .semesterNumber(section.getSemester().getNumber())
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

        return enrollments.stream().map(enrollment -> {
            StudentProfile student = enrollment.getStudent();
            User studentUser = student.getUser();
            List<InternalMarks> marks = internalMarksRepository.findByStudentIdAndSectionId(student.getId(), sectionId);

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("studentId", student.getId());
            entry.put("enrollmentNumber", student.getEnrollmentNumber());
            entry.put("studentName", studentUser.getFirstName() + " " + studentUser.getLastName());

            for (InternalMarks mark : marks) {
                Map<String, Object> markData = new LinkedHashMap<>();
                markData.put("maxMarks", mark.getMaxMarks());
                markData.put("obtainedMarks", mark.getObtainedMarks());
                entry.put(mark.getExamName(), markData);
            }

            return entry;
        }).collect(Collectors.toList());
    }

    // ==================== Semester Marks ====================

    @Transactional
    public Map<String, Object> uploadSemesterMarks(String email, UploadSemesterMarksRequest request) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + request.getSectionId()));
        validateFacultyOwnsSection(faculty, section);

        int updated = 0;
        int created = 0;

        for (UploadSemesterMarksRequest.StudentSemesterMarksEntry entry : request.getEntries()) {
            StudentProfile student = studentProfileRepository.findById(entry.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + entry.getStudentId()));

            if (!enrollmentRepository.existsByStudentIdAndSectionId(student.getId(), section.getId())) {
                throw new BadRequestException("Student " + entry.getStudentId() + " is not enrolled in section " + section.getId());
            }

            if (entry.getObtainedMarks() > request.getMaxMarks()) {
                throw new BadRequestException("Obtained marks exceeds max marks for student " + entry.getStudentId());
            }

            double percentage = (entry.getObtainedMarks() / request.getMaxMarks()) * 100.0;
            String grade = Grade.calculateGrade(percentage);
            double gradePoints = Grade.calculateGradePoints(percentage);

            Optional<SemesterMarks> existing = semesterMarksRepository
                    .findByStudentIdAndSectionIdEquals(student.getId(), section.getId());

            if (existing.isPresent()) {
                existing.get().setMaxMarks(request.getMaxMarks());
                existing.get().setObtainedMarks(entry.getObtainedMarks());
                existing.get().setGrade(grade);
                existing.get().setGradePoints(gradePoints);
                semesterMarksRepository.save(existing.get());
                updated++;
            } else {
                SemesterMarks marks = SemesterMarks.builder()
                        .student(student)
                        .section(section)
                        .maxMarks(request.getMaxMarks())
                        .obtainedMarks(entry.getObtainedMarks())
                        .grade(grade)
                        .gradePoints(gradePoints)
                        .build();
                semesterMarksRepository.save(marks);
                created++;
            }
        }

        log.info("Faculty {} uploaded semester marks for section {}: {} created, {} updated",
                email, section.getId(), created, updated);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sectionId", section.getId());
        result.put("created", created);
        result.put("updated", updated);
        result.put("message", "Semester marks uploaded successfully");
        return result;
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
                .fileName(request.getFileName())
                .uploadedBy(facultyUser)
                .build();

        assignment = assignmentRepository.save(assignment);

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
                .fileName(request.getFileName())
                .uploadedBy(facultyUser)
                .build();

        material = courseMaterialRepository.save(material);

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

    // ==================== Question Papers ====================

    @Transactional
    public QuestionPaperResponse uploadQuestionPaper(String email, CreateQuestionPaperRequest request) {
        User facultyUser = getUserByEmail(email);

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseId()));

        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + request.getDepartmentId()));

        QuestionPaper qp = QuestionPaper.builder()
                .course(course)
                .department(department)
                .examType(request.getExamType().toUpperCase())
                .year(request.getYear())
                .semesterNumber(request.getSemesterNumber())
                .fileName(request.getFileName())
                .status("PENDING")
                .uploadedBy(facultyUser)
                .build();

        qp = questionPaperRepository.save(qp);

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

        // If department-specific, send to students in that department
        // Otherwise, broadcast to all students
        List<User> recipients;
        if (request.getDepartmentId() != null) {
            Department dept = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + request.getDepartmentId()));
            List<StudentProfile> students = studentProfileRepository.findByDepartmentId(dept.getId());
            recipients = students.stream().map(StudentProfile::getUser).collect(Collectors.toList());
        } else {
            recipients = userRepository.findByRole(Role.STUDENT);
        }

        int sent = 0;
        for (User recipient : recipients) {
            Notification notification = Notification.builder()
                    .user(recipient)
                    .title(request.getTitle())
                    .message(request.getMessage())
                    .type(type)
                    .build();
            notificationRepository.save(notification);
            sent++;
        }

        log.info("Faculty {} drafted notice '{}' to {} students", email, request.getTitle(), sent);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("title", request.getTitle());
        result.put("recipientCount", sent);
        result.put("departmentId", request.getDepartmentId());
        result.put("message", "Notice sent successfully to " + sent + " students");
        return result;
    }

    // ==================== Analytics ====================

    public FacultyAnalyticsResponse getAnalytics(String email, Long sectionId) {
        FacultyProfile faculty = getFacultyByEmail(email);
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionId));
        validateFacultyOwnsSection(faculty, section);

        List<Enrollment> enrollments = enrollmentRepository.findBySectionId(sectionId);
        long totalStudents = enrollments.size();

        // --- Attendance Analytics ---
        double totalAttendancePercentage = 0;
        long above75 = 0;
        long below75 = 0;

        for (Enrollment enrollment : enrollments) {
            long total = attendanceRepository.countByStudentIdAndSectionId(enrollment.getStudent().getId(), sectionId);
            long present = attendanceRepository.countByStudentIdAndSectionIdAndStatus(
                    enrollment.getStudent().getId(), sectionId, AttendanceStatus.PRESENT);
            double pct = total > 0 ? (present * 100.0) / total : 0.0;
            totalAttendancePercentage += pct;
            if (pct >= 75.0) above75++;
            else below75++;
        }

        double avgAttendance = totalStudents > 0 ? Math.round((totalAttendancePercentage / totalStudents) * 100.0) / 100.0 : 0.0;

        // --- Internal Marks Analytics ---
        Double ia1Avg = null, ia2Avg = null, ia1Max = null, ia2Max = null;
        double ia1Total = 0, ia2Total = 0;
        int ia1Count = 0, ia2Count = 0;

        for (Enrollment enrollment : enrollments) {
            List<InternalMarks> marks = internalMarksRepository.findByStudentIdAndSectionId(
                    enrollment.getStudent().getId(), sectionId);
            for (InternalMarks m : marks) {
                if ("IA-1".equals(m.getExamName())) {
                    ia1Total += m.getObtainedMarks();
                    ia1Max = m.getMaxMarks();
                    ia1Count++;
                } else if ("IA-2".equals(m.getExamName())) {
                    ia2Total += m.getObtainedMarks();
                    ia2Max = m.getMaxMarks();
                    ia2Count++;
                }
            }
        }

        if (ia1Count > 0) ia1Avg = Math.round((ia1Total / ia1Count) * 100.0) / 100.0;
        if (ia2Count > 0) ia2Avg = Math.round((ia2Total / ia2Count) * 100.0) / 100.0;

        // --- Semester Marks Analytics ---
        Double semAvg = null, semMax = null, passPct = null;
        long totalPassed = 0, totalFailed = 0;
        double semTotal = 0;
        int semCount = 0;
        Map<String, Long> gradeMap = new LinkedHashMap<>();

        for (Enrollment enrollment : enrollments) {
            Optional<SemesterMarks> semMarks = semesterMarksRepository
                    .findByStudentIdAndSectionIdEquals(enrollment.getStudent().getId(), sectionId);
            if (semMarks.isPresent()) {
                SemesterMarks sm = semMarks.get();
                semTotal += sm.getObtainedMarks();
                semMax = sm.getMaxMarks();
                semCount++;

                if (sm.getGrade() != null && !"F".equals(sm.getGrade())) {
                    totalPassed++;
                } else if (sm.getGrade() != null) {
                    totalFailed++;
                }

                String grade = sm.getGrade() != null ? sm.getGrade() : "N/A";
                gradeMap.merge(grade, 1L, Long::sum);
            }
        }

        if (semCount > 0) {
            semAvg = Math.round((semTotal / semCount) * 100.0) / 100.0;
            passPct = Math.round((totalPassed * 100.0) / semCount * 100.0) / 100.0;
        }

        List<FacultyAnalyticsResponse.GradeCount> gradeDistribution = gradeMap.entrySet().stream()
                .map(e -> FacultyAnalyticsResponse.GradeCount.builder()
                        .grade(e.getKey())
                        .count(e.getValue())
                        .build())
                .collect(Collectors.toList());

        return FacultyAnalyticsResponse.builder()
                .sectionId(sectionId)
                .courseName(section.getCourse().getName())
                .courseCode(section.getCourse().getCode())
                .totalStudents(totalStudents)
                .averageAttendancePercentage(avgAttendance)
                .studentsAbove75Attendance(above75)
                .studentsBelow75Attendance(below75)
                .ia1Average(ia1Avg)
                .ia2Average(ia2Avg)
                .ia1MaxMarks(ia1Max)
                .ia2MaxMarks(ia2Max)
                .semesterAverage(semAvg)
                .semesterMaxMarks(semMax)
                .passPercentage(passPct)
                .totalPassed(totalPassed)
                .totalFailed(totalFailed)
                .gradeDistribution(gradeDistribution)
                .build();
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
                .createdAt(a.getCreatedAt())
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
                .createdAt(m.getCreatedAt())
                .build();
    }

    private QuestionPaperResponse mapQuestionPaperToResponse(QuestionPaper qp) {
        return questionPaperService.mapToResponse(qp);
    }
}
