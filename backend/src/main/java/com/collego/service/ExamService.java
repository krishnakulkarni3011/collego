package com.collego.service;

import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.*;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Examinations: exam periods, schedules, seating, hall tickets, invigilation,
 * revaluation requests and semester promotion.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class ExamService {

    private final ExamRepository examRepository;
    private final ExamScheduleRepository examScheduleRepository;
    private final RevaluationRequestRepository revaluationRepository;
    private final SemesterRepository semesterRepository;
    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    // ==================== Exams (admin) ====================

    public List<ExamResponse> listExams() {
        return examRepository.findAllByOrderByStartDateDesc().stream()
                .map(this::mapExam)
                .collect(Collectors.toList());
    }

    @Transactional
    public ExamResponse createExam(CreateExamRequest request) {
        Semester semester = semesterRepository.findById(request.getSemesterId())
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found"));

        ExamType type;
        try {
            type = ExamType.valueOf(request.getExamType().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unsupported exam type: " + request.getExamType());
        }

        Exam exam = Exam.builder()
                .name(request.getName().trim())
                .examType(type)
                .semester(semester)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(ExamStatus.DRAFT)
                .build();
        return mapExam(examRepository.save(exam));
    }

    @Transactional
    public ExamResponse updateExamStatus(Long examId, String status) {
        Exam exam = getExam(examId);
        ExamStatus next;
        try {
            next = ExamStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unsupported exam status: " + status);
        }
        if (next == ExamStatus.PUBLISHED && examScheduleRepository.countByExamId(examId) == 0) {
            throw new BadRequestException("Add at least one paper before publishing this exam.");
        }
        exam.setStatus(next);
        return mapExam(examRepository.save(exam));
    }

    @Transactional
    public void deleteExam(Long examId) {
        Exam exam = getExam(examId);
        examScheduleRepository.deleteByExamId(examId);
        examRepository.delete(exam);
    }

    // ==================== Schedules ====================

    public List<ExamScheduleResponse> listSchedules(Long examId) {
        getExam(examId);
        return examScheduleRepository.findByExamIdOrderByExamDateAscStartTimeAsc(examId).stream()
                .map(this::mapSchedule)
                .collect(Collectors.toList());
    }

    @Transactional
    public ExamScheduleResponse createSchedule(CreateExamScheduleRequest request) {
        Exam exam = getExam(request.getExamId());
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        if (!section.getSemester().getId().equals(exam.getSemester().getId())) {
            throw new BadRequestException("The section does not belong to the exam's semester.");
        }
        if (examScheduleRepository.findByExamIdAndCourseIdAndSectionId(
                exam.getId(), course.getId(), section.getId()).isPresent()) {
            throw new BadRequestException("A paper for this course and section already exists in this exam.");
        }
        if (request.getEndTime().isBefore(request.getStartTime())
                || request.getEndTime().equals(request.getStartTime())) {
            throw new BadRequestException("End time must be after the start time.");
        }

        FacultyProfile invigilator = null;
        if (request.getInvigilatorId() != null) {
            invigilator = facultyProfileRepository.findById(request.getInvigilatorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Invigilator not found"));
        }

        ExamSchedule schedule = ExamSchedule.builder()
                .exam(exam)
                .course(course)
                .section(section)
                .examDate(request.getExamDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .room(request.getRoom())
                .invigilator(invigilator)
                .build();

        return mapSchedule(examScheduleRepository.save(schedule));
    }

    @Transactional
    public void deleteSchedule(Long scheduleId) {
        ExamSchedule schedule = examScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found"));
        examScheduleRepository.delete(schedule);
    }

    @Transactional
    public ExamScheduleResponse assignInvigilator(Long scheduleId, Long facultyId) {
        ExamSchedule schedule = examScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found"));
        FacultyProfile faculty = null;
        if (facultyId != null) {
            faculty = facultyProfileRepository.findById(facultyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Faculty not found"));
        }
        schedule.setInvigilator(faculty);
        return mapSchedule(examScheduleRepository.save(schedule));
    }

    public List<Map<String, Object>> listInvigilators() {
        return facultyProfileRepository.findAll().stream()
                .map(f -> Map.<String, Object>of(
                        "id", f.getId(),
                        "name", f.getUser().getFirstName() + " " + f.getUser().getLastName(),
                        "employeeId", f.getEmployeeId() != null ? f.getEmployeeId() : "",
                        "department", f.getDepartment() != null ? f.getDepartment().getCode() : ""))
                .collect(Collectors.toList());
    }

    // ==================== Seating ====================

    public List<SeatingRowResponse> seating(Long examId) {
        getExam(examId);
        List<SeatingRowResponse> rows = new ArrayList<>();

        for (ExamSchedule schedule : examScheduleRepository.findByExamIdOrderByExamDateAscStartTimeAsc(examId)) {
            List<Enrollment> enrollments = activeEnrollments(schedule.getSection().getId());
            int seat = 1;
            for (Enrollment enrollment : enrollments) {
                StudentProfile student = enrollment.getStudent();
                rows.add(SeatingRowResponse.builder()
                        .scheduleId(schedule.getId())
                        .examId(examId)
                        .courseName(schedule.getCourse().getName())
                        .courseCode(schedule.getCourse().getCode())
                        .examDate(schedule.getExamDate())
                        .startTime(schedule.getStartTime())
                        .endTime(schedule.getEndTime())
                        .room(schedule.getRoom())
                        .seatNumber(seat++)
                        .studentId(student.getId())
                        .studentName(student.getUser().getFirstName() + " " + student.getUser().getLastName())
                        .enrollmentNumber(student.getEnrollmentNumber())
                        .sectionName(schedule.getSection().getName())
                        .invigilatorName(schedule.getInvigilator() != null
                                ? schedule.getInvigilator().getUser().getFirstName() + " "
                                    + schedule.getInvigilator().getUser().getLastName()
                                : null)
                        .build());
            }
        }
        return rows;
    }

    // ==================== Student ====================

    public List<ExamResponse> studentExams(String email) {
        StudentProfile student = getStudent(email);
        if (student.getSemester() == null) return List.of();

        return examRepository
                .findBySemesterNumberAndStatusNotOrderByStartDateAsc(student.getSemester(), ExamStatus.DRAFT)
                .stream()
                .map(exam -> {
                    ExamResponse response = mapExam(exam);
                    response.setHallTicketAvailable(hasHallTicket(student, exam));
                    return response;
                })
                .collect(Collectors.toList());
    }

    public List<ExamScheduleResponse> studentSchedule(String email, Long examId) {
        StudentProfile student = getStudent(email);
        Exam exam = getExam(examId);
        if (exam.getStatus() == ExamStatus.DRAFT) {
            throw new BadRequestException("This exam has not been published yet.");
        }
        Set<Long> sectionIds = activeEnrollmentsForStudent(student.getId()).stream()
                .map(e -> e.getSection().getId())
                .collect(Collectors.toSet());

        return examScheduleRepository.findByExamIdOrderByExamDateAscStartTimeAsc(examId).stream()
                .filter(s -> sectionIds.contains(s.getSection().getId()))
                .map(this::mapSchedule)
                .collect(Collectors.toList());
    }

    public boolean hasHallTicket(StudentProfile student, Exam exam) {
        Set<Long> sectionIds = activeEnrollmentsForStudent(student.getId()).stream()
                .map(e -> e.getSection().getId())
                .collect(Collectors.toSet());
        return examScheduleRepository.findByExamIdOrderByExamDateAscStartTimeAsc(exam.getId()).stream()
                .anyMatch(s -> sectionIds.contains(s.getSection().getId()));
    }

    public byte[] hallTicket(String email, Long examId) {
        StudentProfile student = getStudent(email);
        Exam exam = getExam(examId);

        if (exam.getStatus() == ExamStatus.DRAFT) {
            throw new BadRequestException("This exam has not been published yet.");
        }

        Set<Long> sectionIds = activeEnrollmentsForStudent(student.getId()).stream()
                .map(e -> e.getSection().getId())
                .collect(Collectors.toSet());

        List<ExamSchedule> schedules = examScheduleRepository
                .findByExamIdOrderByExamDateAscStartTimeAsc(examId).stream()
                .filter(s -> sectionIds.contains(s.getSection().getId()))
                .collect(Collectors.toList());

        if (schedules.isEmpty()) {
            throw new BadRequestException("No papers are scheduled for you in this exam.");
        }

        return buildHallTicketPdf(student, exam, schedules);
    }

    @Transactional
    public RevaluationResponse requestRevaluation(String email, CreateRevaluationRequest request) {
        StudentProfile student = getStudent(email);
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        Semester semester = semesterRepository.findById(request.getSemesterId())
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found"));

        boolean enrolled = enrollmentRepository.findByStudentId(student.getId()).stream()
                .anyMatch(e -> e.getSection() != null
                        && e.getSection().getCourse() != null
                        && e.getSection().getCourse().getId().equals(course.getId())
                        && e.getSection().getSemester() != null
                        && e.getSection().getSemester().getId().equals(semester.getId()));
        if (!enrolled) {
            throw new BadRequestException("You can only request revaluation for courses you have taken.");
        }

        if (revaluationRepository.existsByStudentIdAndCourseIdAndSemesterIdAndStatusIn(
                student.getId(), course.getId(), semester.getId(),
                List.of(RevaluationStatus.PENDING, RevaluationStatus.APPROVED))) {
            throw new BadRequestException("A revaluation request for this course is already open.");
        }

        RevaluationRequest entity = RevaluationRequest.builder()
                .student(student)
                .course(course)
                .semester(semester)
                .reason(request.getReason().trim())
                .status(RevaluationStatus.PENDING)
                .build();
        return mapRevaluation(revaluationRepository.save(entity));
    }

    public List<RevaluationResponse> myRevaluations(String email) {
        StudentProfile student = getStudent(email);
        return revaluationRepository.findByStudentIdOrderByRequestedAtDesc(student.getId()).stream()
                .map(this::mapRevaluation)
                .collect(Collectors.toList());
    }

    /** Courses the student has an enrolment for, grouped by course + semester. */
    public List<Map<String, Object>> coursesTaken(String email) {
        StudentProfile student = getStudent(email);
        Map<String, Map<String, Object>> unique = new LinkedHashMap<>();

        for (Enrollment enrollment : enrollmentRepository.findByStudentId(student.getId())) {
            Section section = enrollment.getSection();
            if (section == null || section.getCourse() == null || section.getSemester() == null) continue;
            String key = section.getCourse().getId() + ":" + section.getSemester().getId();
            unique.putIfAbsent(key, Map.of(
                    "courseId", section.getCourse().getId(),
                    "courseName", section.getCourse().getName(),
                    "courseCode", section.getCourse().getCode(),
                    "semesterId", section.getSemester().getId(),
                    "semesterName", section.getSemester().getName()));
        }
        return new ArrayList<>(unique.values());
    }

    // ==================== Revaluation (admin) ====================

    public List<RevaluationResponse> allRevaluations() {
        return revaluationRepository.findAllByOrderByRequestedAtDesc().stream()
                .map(this::mapRevaluation)
                .collect(Collectors.toList());
    }

    @Transactional
    public RevaluationResponse resolveRevaluation(Long id, ResolveRevaluationRequest request) {
        RevaluationRequest entity = revaluationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Revaluation request not found"));

        RevaluationStatus status;
        try {
            status = RevaluationStatus.valueOf(request.getStatus().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Status must be APPROVED or REJECTED.");
        }
        if (status == RevaluationStatus.PENDING) {
            throw new BadRequestException("Status must be APPROVED or REJECTED.");
        }

        entity.setStatus(status);
        entity.setResponse(request.getResponse());
        entity.setResolvedAt(LocalDateTime.now());
        revaluationRepository.save(entity);

        try {
            User user = entity.getStudent().getUser();
            notificationRepository.save(Notification.builder()
                    .user(user)
                    .title("Revaluation " + status.name().toLowerCase(Locale.ROOT))
                    .message("Your revaluation request for " + entity.getCourse().getName()
                            + " was " + status.name().toLowerCase(Locale.ROOT) + "."
                            + (request.getResponse() != null ? " " + request.getResponse() : ""))
                    .type(NotificationType.ACADEMIC)
                    .build());
            emailService.send(user.getEmail(), "Revaluation request " + status.name().toLowerCase(Locale.ROOT),
                    "Hello " + user.getFirstName() + ",\n\n"
                    + "Your revaluation request for " + entity.getCourse().getName() + " ("
                    + entity.getSemester().getName() + ") has been "
                    + status.name().toLowerCase(Locale.ROOT) + ".\n"
                    + (request.getResponse() != null ? request.getResponse() + "\n" : "")
                    + "\n— Collego Examinations");
        } catch (Exception ex) {
            log.warn("Could not notify revaluation result: {}", ex.getMessage());
        }

        return mapRevaluation(entity);
    }

    // ==================== Promotion ====================

    public Map<String, Object> previewPromotion(Long fromSemesterId, Long toSemesterId) {
        Semester from = getSemester(fromSemesterId);
        Semester to = getSemester(toSemesterId);
        List<StudentProfile> students = studentsInSemester(from.getNumber());
        List<Section> targetSections = sectionRepository.findBySemesterId(toSemesterId);

        long eligible = students.stream().filter(s -> s.getDepartment() != null && targetSections.stream()
                .anyMatch(sec -> sec.getCourse() != null && sec.getCourse().getDepartment() != null
                        && sec.getCourse().getDepartment().getId().equals(s.getDepartment().getId())))
                .count();

        return Map.of(
                "fromSemester", from.getName(),
                "toSemester", to.getName(),
                "studentCount", students.size(),
                "eligibleCount", eligible,
                "targetSectionCount", targetSections.size());
    }

    @Transactional
    public Map<String, Object> promoteStudents(Long fromSemesterId, Long toSemesterId) {
        Semester from = getSemester(fromSemesterId);
        Semester to = getSemester(toSemesterId);
        if (to.getNumber() <= from.getNumber()) {
            throw new BadRequestException("The target semester must come after the source semester.");
        }

        List<StudentProfile> students = studentsInSemester(from.getNumber());
        List<Section> targetSections = sectionRepository.findBySemesterId(toSemesterId);

        int promoted = 0;
        int skipped = 0;

        for (StudentProfile student : students) {
            if (student.getDepartment() == null) { skipped++; continue; }

            List<Section> sections = targetSections.stream()
                    .filter(sec -> sec.getCourse() != null && sec.getCourse().getDepartment() != null
                            && sec.getCourse().getDepartment().getId().equals(student.getDepartment().getId()))
                    .collect(Collectors.toList());
            if (sections.isEmpty()) { skipped++; continue; }

            // Close current enrolments.
            for (Enrollment enrollment : enrollmentRepository.findByStudentIdAndStatus(
                    student.getId(), EnrollmentStatus.ACTIVE)) {
                enrollment.setStatus(EnrollmentStatus.COMPLETED);
                enrollmentRepository.save(enrollment);
            }

            // One section per course, preferring the student's section letter (A/B).
            Map<Long, Section> byCourse = new LinkedHashMap<>();
            for (Section section : sections) {
                Long courseId = section.getCourse().getId();
                Section current = byCourse.get(courseId);
                if (current == null
                        || (section.getName() != null && section.getName().equalsIgnoreCase(student.getSection()))) {
                    byCourse.put(courseId, section);
                }
            }

            for (Section section : byCourse.values()) {
                if (!enrollmentRepository.existsByStudentIdAndSectionId(student.getId(), section.getId())) {
                    enrollmentRepository.save(Enrollment.builder()
                            .student(student)
                            .section(section)
                            .status(EnrollmentStatus.ACTIVE)
                            .build());
                }
            }

            student.setSemester(to.getNumber());
            studentProfileRepository.save(student);
            promoted++;
        }

        log.info("Promoted {} students from {} to {}", promoted, from.getName(), to.getName());
        return Map.of(
                "promoted", promoted,
                "skipped", skipped,
                "fromSemester", from.getName(),
                "toSemester", to.getName());
    }

    // ==================== Faculty ====================

    public List<ExamScheduleResponse> myInvigilations(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        FacultyProfile faculty = facultyProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Faculty profile not found"));

        return examScheduleRepository.findByInvigilatorIdOrderByExamDateAscStartTimeAsc(faculty.getId())
                .stream()
                .map(this::mapSchedule)
                .collect(Collectors.toList());
    }

    // ==================== Helpers ====================

    private Exam getExam(Long id) {
        return examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + id));
    }

    private Semester getSemester(Long id) {
        return semesterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found: " + id));
    }

    private StudentProfile getStudent(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
    }

    private List<Enrollment> activeEnrollments(Long sectionId) {
        return enrollmentRepository.findBySectionId(sectionId).stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
                .sorted(Comparator.comparing(e -> e.getStudent().getEnrollmentNumber() != null
                        ? e.getStudent().getEnrollmentNumber() : ""))
                .collect(Collectors.toList());
    }

    private List<Enrollment> activeEnrollmentsForStudent(Long studentId) {
        return enrollmentRepository.findByStudentIdAndStatus(studentId, EnrollmentStatus.ACTIVE);
    }

    private List<StudentProfile> studentsInSemester(Integer semesterNumber) {
        return studentProfileRepository.findAll().stream()
                .filter(s -> Objects.equals(s.getSemester(), semesterNumber))
                .collect(Collectors.toList());
    }

    private ExamResponse mapExam(Exam exam) {
        return ExamResponse.builder()
                .id(exam.getId())
                .name(exam.getName())
                .examType(exam.getExamType() != null ? exam.getExamType().name() : null)
                .semesterId(exam.getSemester() != null ? exam.getSemester().getId() : null)
                .semesterName(exam.getSemester() != null ? exam.getSemester().getName() : null)
                .semesterNumber(exam.getSemester() != null ? exam.getSemester().getNumber() : null)
                .startDate(exam.getStartDate())
                .endDate(exam.getEndDate())
                .status(exam.getStatus() != null ? exam.getStatus().name() : null)
                .scheduleCount(exam.getId() != null ? examScheduleRepository.countByExamId(exam.getId()) : 0)
                .build();
    }

    private ExamScheduleResponse mapSchedule(ExamSchedule schedule) {
        long students = enrollmentRepository.findBySectionId(schedule.getSection().getId()).stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
                .count();

        return ExamScheduleResponse.builder()
                .id(schedule.getId())
                .examId(schedule.getExam() != null ? schedule.getExam().getId() : null)
                .courseId(schedule.getCourse() != null ? schedule.getCourse().getId() : null)
                .courseName(schedule.getCourse() != null ? schedule.getCourse().getName() : null)
                .courseCode(schedule.getCourse() != null ? schedule.getCourse().getCode() : null)
                .sectionId(schedule.getSection() != null ? schedule.getSection().getId() : null)
                .sectionName(schedule.getSection() != null ? schedule.getSection().getName() : null)
                .examDate(schedule.getExamDate())
                .startTime(schedule.getStartTime())
                .endTime(schedule.getEndTime())
                .room(schedule.getRoom())
                .invigilatorId(schedule.getInvigilator() != null ? schedule.getInvigilator().getId() : null)
                .invigilatorName(schedule.getInvigilator() != null
                        ? schedule.getInvigilator().getUser().getFirstName() + " "
                            + schedule.getInvigilator().getUser().getLastName()
                        : null)
                .studentCount(students)
                .build();
    }

    private RevaluationResponse mapRevaluation(RevaluationRequest entity) {
        StudentProfile student = entity.getStudent();
        return RevaluationResponse.builder()
                .id(entity.getId())
                .studentId(student != null ? student.getId() : null)
                .studentName(student != null && student.getUser() != null
                        ? student.getUser().getFirstName() + " " + student.getUser().getLastName() : null)
                .enrollmentNumber(student != null ? student.getEnrollmentNumber() : null)
                .courseId(entity.getCourse() != null ? entity.getCourse().getId() : null)
                .courseName(entity.getCourse() != null ? entity.getCourse().getName() : null)
                .courseCode(entity.getCourse() != null ? entity.getCourse().getCode() : null)
                .semesterId(entity.getSemester() != null ? entity.getSemester().getId() : null)
                .semesterName(entity.getSemester() != null ? entity.getSemester().getName() : null)
                .reason(entity.getReason())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .response(entity.getResponse())
                .requestedAt(entity.getRequestedAt())
                .resolvedAt(entity.getResolvedAt())
                .build();
    }

    // ==================== Hall ticket PDF ====================

    private byte[] buildHallTicketPdf(StudentProfile student, Exam exam, List<ExamSchedule> schedules) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 42, 42, 42, 42);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD, new Color(49, 46, 129));
            Font subFont = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(100, 116, 139));
            Font labelFont = new Font(Font.HELVETICA, 9, Font.BOLD, new Color(71, 85, 105));
            Font bodyFont = new Font(Font.HELVETICA, 10);

            Paragraph title = new Paragraph("COLLEGO", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subtitle = new Paragraph("Department of Computer Science & Engineering", subFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            document.add(subtitle);

            Paragraph heading = new Paragraph("EXAMINATION HALL TICKET",
                    new Font(Font.HELVETICA, 13, Font.BOLD));
            heading.setAlignment(Element.ALIGN_CENTER);
            heading.setSpacingBefore(16);
            heading.setSpacingAfter(12);
            document.add(heading);

            User user = student.getUser();
            PdfPTable meta = new PdfPTable(2);
            meta.setWidthPercentage(100);
            meta.setWidths(new float[]{1, 2});
            addRow(meta, "Exam", exam.getName(), labelFont, bodyFont);
            addRow(meta, "Student", user.getFirstName() + " " + user.getLastName(), labelFont, bodyFont);
            addRow(meta, "USN", student.getEnrollmentNumber() != null ? student.getEnrollmentNumber() : "-",
                    labelFont, bodyFont);
            addRow(meta, "Semester", exam.getSemester() != null ? exam.getSemester().getName() : "-",
                    labelFont, bodyFont);
            addRow(meta, "Section", student.getSection() != null ? student.getSection() : "-",
                    labelFont, bodyFont);
            addRow(meta, "Generated", LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")),
                    labelFont, bodyFont);
            document.add(meta);

            PdfPTable table = new PdfPTable(new float[]{2.4f, 3f, 1.4f, 1.5f, 1.4f, 1f});
            table.setWidthPercentage(100);
            table.setSpacingBefore(18);
            addHeader(table, "Course");
            addHeader(table, "Date");
            addHeader(table, "Time");
            addHeader(table, "Room");
            addHeader(table, "Invigilator");
            addHeader(table, "Seat");

            for (ExamSchedule schedule : schedules) {
                table.addCell(cell(schedule.getCourse().getName() + "\n" + schedule.getCourse().getCode(), bodyFont));
                table.addCell(cell(schedule.getExamDate() != null
                        ? schedule.getExamDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "-", bodyFont));
                table.addCell(cell(schedule.getStartTime() + " - " + schedule.getEndTime(), bodyFont));
                table.addCell(cell(schedule.getRoom() != null ? schedule.getRoom() : "TBA", bodyFont));
                table.addCell(cell(schedule.getInvigilator() != null
                        ? schedule.getInvigilator().getUser().getFirstName() + " "
                            + schedule.getInvigilator().getUser().getLastName() : "TBA", bodyFont));
                table.addCell(cell(String.valueOf(seatNumber(schedule, student)), bodyFont));
            }
            document.add(table);

            Paragraph instructions = new Paragraph(
                    "\nInstructions\n"
                    + "• Carry this hall ticket and your college ID card to every paper.\n"
                    + "• Report to the room at least 15 minutes before the start time.\n"
                    + "• Mobile phones and smart devices are not allowed in the examination hall.\n"
                    + "• Seating may be changed by the invigilator on duty.",
                    new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(71, 85, 105)));
            instructions.setSpacingBefore(20);
            document.add(instructions);

            Paragraph footer = new Paragraph("\n\nController of Examinations ______________________", subFont);
            footer.setSpacingBefore(28);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (DocumentException ex) {
            throw new RuntimeException("Could not generate hall ticket", ex);
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    private int seatNumber(ExamSchedule schedule, StudentProfile student) {
        List<Enrollment> enrollments = activeEnrollments(schedule.getSection().getId());
        for (int i = 0; i < enrollments.size(); i++) {
            if (enrollments.get(i).getStudent().getId().equals(student.getId())) {
                return i + 1;
            }
        }
        return 0;
    }

    private void addRow(PdfPTable table, String label, String value, Font labelFont, Font bodyFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPaddingBottom(5);
        PdfPCell valueCell = new PdfPCell(new Phrase(value != null ? value : "-", bodyFont));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPaddingBottom(5);
        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addHeader(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text,
                new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE)));
        cell.setBackgroundColor(new Color(79, 70, 229));
        cell.setPadding(7);
        table.addCell(cell);
    }

    private PdfPCell cell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "-", font));
        cell.setPadding(7);
        return cell;
    }
}
