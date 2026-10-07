package com.collego.service;

import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentPortalService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final InternalMarksRepository internalMarksRepository;
    private final SemesterMarksRepository semesterMarksRepository;
    private final SemesterRepository semesterRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final FeeRepository feeRepository;
    private final PlacementNoticeRepository placementNoticeRepository;
    private final NotificationRepository notificationRepository;
    private final AssignmentRepository assignmentRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final S3StorageService s3StorageService;

    @Value("${collego.aws.s3-bucket-assignments:collego-assignments-prod}")
    private String assignmentBucket;

    @Value("${collego.aws.s3-bucket-materials:collego-materials-prod}")
    private String materialBucket;

    // ==================== Profile ====================

    public StudentProfileResponse getProfile(String email) {
        StudentProfile student = getStudentByEmail(email);
        User user = student.getUser();

        return StudentProfileResponse.builder()
                .id(student.getId())
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .enrollmentNumber(student.getEnrollmentNumber())
                .departmentName(student.getDepartment() != null ? student.getDepartment().getName() : null)
                .departmentCode(student.getDepartment() != null ? student.getDepartment().getCode() : null)
                .currentSemester(student.getSemester())
                .section(student.getSection())
                .admissionYear(student.getAdmissionYear())
                .build();
    }

    // ==================== Attendance ====================

    public List<SubjectAttendanceResponse> getAttendance(String email, Long semesterId) {
        StudentProfile student = getStudentByEmail(email);
        List<Enrollment> enrollments = getEnrollments(student, semesterId);

        return enrollments.stream().map(enrollment -> {
            Section section = enrollment.getSection();
            long totalClasses = attendanceRepository.countByStudentIdAndSectionId(student.getId(), section.getId());
            long present = attendanceRepository.countByStudentIdAndSectionIdAndStatus(
                    student.getId(), section.getId(), AttendanceStatus.PRESENT);
            long absent = totalClasses - present;
            double percentage = totalClasses > 0 ? (present * 100.0) / totalClasses : 0.0;

            return SubjectAttendanceResponse.builder()
                    .sectionId(section.getId())
                    .courseName(section.getCourse().getName())
                    .courseCode(section.getCourse().getCode())
                    .totalClasses(totalClasses)
                    .present(present)
                    .absent(absent)
                    .percentage(Math.round(percentage * 100.0) / 100.0)
                    .build();
        }).collect(Collectors.toList());
    }

    public OverallAttendanceResponse getOverallAttendance(String email) {
        StudentProfile student = getStudentByEmail(email);
        List<Enrollment> activeEnrollments = enrollmentRepository.findByStudentIdAndStatus(
                student.getId(), EnrollmentStatus.ACTIVE);

        List<SubjectAttendanceResponse> subjectWise = new ArrayList<>();
        long totalClasses = 0;
        long totalPresent = 0;

        for (Enrollment enrollment : activeEnrollments) {
            Section section = enrollment.getSection();
            long classCount = attendanceRepository.countByStudentIdAndSectionId(student.getId(), section.getId());
            long presentCount = attendanceRepository.countByStudentIdAndSectionIdAndStatus(
                    student.getId(), section.getId(), AttendanceStatus.PRESENT);
            long absentCount = classCount - presentCount;
            double percentage = classCount > 0 ? (presentCount * 100.0) / classCount : 0.0;

            totalClasses += classCount;
            totalPresent += presentCount;

            subjectWise.add(SubjectAttendanceResponse.builder()
                    .sectionId(section.getId())
                    .courseName(section.getCourse().getName())
                    .courseCode(section.getCourse().getCode())
                    .totalClasses(classCount)
                    .present(presentCount)
                    .absent(absentCount)
                    .percentage(Math.round(percentage * 100.0) / 100.0)
                    .build());
        }

        double overallPercentage = totalClasses > 0 ? (totalPresent * 100.0) / totalClasses : 0.0;

        return OverallAttendanceResponse.builder()
                .totalClasses(totalClasses)
                .totalPresent(totalPresent)
                .overallPercentage(Math.round(overallPercentage * 100.0) / 100.0)
                .subjectWise(subjectWise)
                .build();
    }

    // ==================== Internal Marks ====================

    public List<InternalMarksResponse> getInternalMarks(String email, Long semesterId) {
        StudentProfile student = getStudentByEmail(email);
        List<Enrollment> enrollments = getEnrollments(student, semesterId);

        return enrollments.stream().map(enrollment -> {
            Section section = enrollment.getSection();
            List<InternalMarks> marks = internalMarksRepository.findByStudentIdAndSectionId(
                    student.getId(), section.getId());

            Double ia1Max = null, ia1Obtained = null, ia2Max = null, ia2Obtained = null;
            for (InternalMarks mark : marks) {
                if ("IA-1".equals(mark.getExamName())) {
                    ia1Max = mark.getMaxMarks();
                    ia1Obtained = mark.getObtainedMarks();
                } else if ("IA-2".equals(mark.getExamName())) {
                    ia2Max = mark.getMaxMarks();
                    ia2Obtained = mark.getObtainedMarks();
                }
            }

            return InternalMarksResponse.builder()
                    .sectionId(section.getId())
                    .courseName(section.getCourse().getName())
                    .courseCode(section.getCourse().getCode())
                    .credits(section.getCourse().getCredits())
                    .ia1MaxMarks(ia1Max)
                    .ia1ObtainedMarks(ia1Obtained)
                    .ia2MaxMarks(ia2Max)
                    .ia2ObtainedMarks(ia2Obtained)
                    .build();
        }).collect(Collectors.toList());
    }

    // ==================== Semester Marks ====================

    public List<SemesterMarksResponse> getSemesterMarks(String email, Long semesterId) {
        StudentProfile student = getStudentByEmail(email);
        List<Enrollment> enrollments = getEnrollments(student, semesterId);

        return enrollments.stream().map(enrollment -> {
            Section section = enrollment.getSection();
            SemesterMarks marks = semesterMarksRepository
                    .findByStudentIdAndSectionIdEquals(student.getId(), section.getId())
                    .orElse(null);

            SemesterMarksResponse.SemesterMarksResponseBuilder builder = SemesterMarksResponse.builder()
                    .sectionId(section.getId())
                    .courseName(section.getCourse().getName())
                    .courseCode(section.getCourse().getCode())
                    .credits(section.getCourse().getCredits());

            if (marks != null) {
                builder.maxMarks(marks.getMaxMarks())
                       .obtainedMarks(marks.getObtainedMarks())
                       .grade(marks.getGrade())
                       .gradePoints(marks.getGradePoints());
            }

            return builder.build();
        }).collect(Collectors.toList());
    }

    // ==================== SGPA / CGPA ====================

    public CgpaResponse calculateCgpa(String email) {
        StudentProfile student = getStudentByEmail(email);
        List<Semester> allSemesters = semesterRepository.findAllByOrderByNumberDesc();

        List<SgpaResponse> semesterSgpas = new ArrayList<>();
        double totalCreditPoints = 0;
        double totalCredits = 0;

        // Process semesters in order (ascending)
        List<Semester> sortedSemesters = allSemesters.stream()
                .sorted(Comparator.comparingInt(Semester::getNumber))
                .collect(Collectors.toList());

        for (Semester semester : sortedSemesters) {
            List<Enrollment> enrollments = enrollmentRepository
                    .findByStudentIdAndSectionSemesterId(student.getId(), semester.getId());

            if (enrollments.isEmpty()) continue;

            List<SemesterMarksResponse> subjects = new ArrayList<>();
            double semCreditPoints = 0;
            double semCredits = 0;
            boolean hasMarks = false;

            for (Enrollment enrollment : enrollments) {
                Section section = enrollment.getSection();
                SemesterMarks marks = semesterMarksRepository
                        .findByStudentIdAndSectionIdEquals(student.getId(), section.getId())
                        .orElse(null);

                SemesterMarksResponse.SemesterMarksResponseBuilder subjectBuilder = SemesterMarksResponse.builder()
                        .sectionId(section.getId())
                        .courseName(section.getCourse().getName())
                        .courseCode(section.getCourse().getCode())
                        .credits(section.getCourse().getCredits());

                if (marks != null) {
                    hasMarks = true;
                    subjectBuilder.maxMarks(marks.getMaxMarks())
                                  .obtainedMarks(marks.getObtainedMarks())
                                  .grade(marks.getGrade())
                                  .gradePoints(marks.getGradePoints());

                    double credits = section.getCourse().getCredits();
                    semCreditPoints += credits * marks.getGradePoints();
                    semCredits += credits;
                }

                subjects.add(subjectBuilder.build());
            }

            if (!hasMarks) continue;

            double sgpa = semCredits > 0 ? Math.round((semCreditPoints / semCredits) * 100.0) / 100.0 : 0.0;
            totalCreditPoints += semCreditPoints;
            totalCredits += semCredits;

            semesterSgpas.add(SgpaResponse.builder()
                    .semesterId(semester.getId())
                    .semesterName(semester.getName())
                    .semesterNumber(semester.getNumber())
                    .academicYear(semester.getAcademicYear())
                    .subjects(subjects)
                    .totalCredits(semCredits)
                    .sgpa(sgpa)
                    .build());
        }

        double cgpa = totalCredits > 0 ? Math.round((totalCreditPoints / totalCredits) * 100.0) / 100.0 : 0.0;

        return CgpaResponse.builder()
                .semesters(semesterSgpas)
                .totalCreditsAllSemesters(totalCredits)
                .cumulativeCgpa(cgpa)
                .build();
    }

    // ==================== Timetable ====================

    public StudentTimetableResponse getTimetable(String email) {
        StudentProfile student = getStudentByEmail(email);
        List<Enrollment> activeEnrollments = enrollmentRepository.findByStudentIdAndStatus(
                student.getId(), EnrollmentStatus.ACTIVE);

        List<Long> sectionIds = activeEnrollments.stream()
                .map(e -> e.getSection().getId())
                .collect(Collectors.toList());

        List<TimetableSlot> slots = timetableSlotRepository.findBySectionIdInOrderByDayOfWeekAscStartTimeAsc(sectionIds);

        Map<String, List<TimetableSlotResponse>> weeklySchedule = new LinkedHashMap<>();
        for (DayOfWeekEnum day : DayOfWeekEnum.values()) {
            weeklySchedule.put(day.name(), new ArrayList<>());
        }

        for (TimetableSlot slot : slots) {
            String facultyName = null;
            if (slot.getSection().getFaculty() != null) {
                User facultyUser = slot.getSection().getFaculty().getUser();
                facultyName = facultyUser.getFirstName() + " " + facultyUser.getLastName();
            }

            TimetableSlotResponse response = TimetableSlotResponse.builder()
                    .id(slot.getId())
                    .sectionId(slot.getSection().getId())
                    .courseName(slot.getSection().getCourse().getName())
                    .courseCode(slot.getSection().getCourse().getCode())
                    .sectionName(slot.getSection().getName())
                    .dayOfWeek(slot.getDayOfWeek().name())
                    .startTime(slot.getStartTime().toString())
                    .endTime(slot.getEndTime().toString())
                    .roomNumber(slot.getRoomNumber())
                    .facultyName(facultyName)
                    .build();

            weeklySchedule.get(slot.getDayOfWeek().name()).add(response);
        }

        return StudentTimetableResponse.builder()
                .weeklySchedule(weeklySchedule)
                .build();
    }

    // ==================== Fees ====================

    public List<FeeResponse> getFees(String email) {
        StudentProfile student = getStudentByEmail(email);
        List<Fee> fees = feeRepository.findByStudentId(student.getId());

        return fees.stream().map(fee -> {
            List<FeeItemResponse> items = fee.getItems().stream()
                    .map(item -> FeeItemResponse.builder()
                            .category(item.getCategory().name())
                            .description(item.getDescription())
                            .amount(item.getAmount())
                            .build())
                    .collect(Collectors.toList());

            return FeeResponse.builder()
                    .id(fee.getId())
                    .semesterId(fee.getSemester().getId())
                    .semesterName(fee.getSemester().getName())
                    .totalAmount(fee.getTotalAmount())
                    .paidAmount(fee.getPaidAmount())
                    .dueDate(fee.getDueDate())
                    .status(fee.getStatus().name())
                    .paidAt(fee.getPaidAt())
                    .transactionRef(fee.getTransactionRef())
                    .items(items)
                    .build();
        }).collect(Collectors.toList());
    }

    // ==================== Placement Notices ====================

    public List<PlacementNoticeResponse> getPlacementNotices(String email) {
        StudentProfile student = getStudentByEmail(email);
        Long departmentId = student.getDepartment() != null ? student.getDepartment().getId() : null;

        List<PlacementNotice> notices;
        if (departmentId != null) {
            notices = placementNoticeRepository.findActiveByDepartmentOrAll(departmentId);
        } else {
            notices = placementNoticeRepository.findByIsActiveTrueOrderByPostedAtDesc();
        }

        return notices.stream().map(notice -> PlacementNoticeResponse.builder()
                .id(notice.getId())
                .title(notice.getTitle())
                .companyName(notice.getCompanyName())
                .description(notice.getDescription())
                .eligibilityCriteria(notice.getEligibilityCriteria())
                .packageOffered(notice.getPackageOffered())
                .lastDate(notice.getLastDate())
                .departmentName(notice.getDepartment() != null ? notice.getDepartment().getName() : "All Departments")
                .postedAt(notice.getPostedAt())
                .build()).collect(Collectors.toList());
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
                        .read(n.isRead())
                        .createdAt(n.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    public long getUnreadNotificationCount(String email) {
        User user = getUserByEmail(email);
        return notificationRepository.countByUserIdAndIsReadFalse(user.getId());
    }

    @Transactional
    public void markNotificationRead(String email, Long notificationId) {
        User user = getUserByEmail(email);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + notificationId));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Notification not found with id: " + notificationId);
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    // ==================== Academic History ====================

    public CgpaResponse getAcademicHistory(String email) {
        // Academic history is the same as CGPA - includes all semesters
        return calculateCgpa(email);
    }

    // ==================== Assignments (Phase 4 + 8) ====================

    /**
     * Returns all assignments for sections the student is actively enrolled in.
     * The hasFile flag indicates whether a downloadable file exists in S3.
     */
    public List<AssignmentResponse> getAssignmentsForStudent(String email) {
        StudentProfile student = getStudentByEmail(email);
        List<Enrollment> enrollments = enrollmentRepository.findByStudentIdAndStatus(
                student.getId(), EnrollmentStatus.ACTIVE);

        List<AssignmentResponse> results = new ArrayList<>();
        for (Enrollment enrollment : enrollments) {
            List<Assignment> assignments = assignmentRepository
                    .findBySectionIdOrderByCreatedAtDesc(enrollment.getSection().getId());
            for (Assignment a : assignments) {
                results.add(AssignmentResponse.builder()
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
                        .build());
            }
        }
        return results;
    }

    /**
     * Download the file for an assignment from S3.
     * Student must be enrolled in the assignment's section.
     */
    public byte[] downloadAssignmentFile(String email, Long assignmentId) throws IOException {
        StudentProfile student = getStudentByEmail(email);
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        // Verify enrollment
        boolean enrolled = enrollmentRepository.existsByStudentIdAndSectionId(
                student.getId(), assignment.getSection().getId());
        if (!enrolled) {
            throw new BadRequestException("You are not enrolled in this assignment's course.");
        }

        if (assignment.getFilePath() == null || assignment.getFilePath().isBlank()) {
            throw new BadRequestException("No file attached to this assignment.");
        }
        return s3StorageService.download(assignmentBucket, assignment.getFilePath());
    }

    // ==================== Course Materials (Phase 4 + 8) ====================

    /**
     * Returns all course materials for sections the student is actively enrolled in.
     */
    public List<CourseMaterialResponse> getMaterialsForStudent(String email) {
        StudentProfile student = getStudentByEmail(email);
        List<Enrollment> enrollments = enrollmentRepository.findByStudentIdAndStatus(
                student.getId(), EnrollmentStatus.ACTIVE);

        List<CourseMaterialResponse> results = new ArrayList<>();
        for (Enrollment enrollment : enrollments) {
            List<CourseMaterial> materials = courseMaterialRepository
                    .findBySectionIdOrderByCreatedAtDesc(enrollment.getSection().getId());
            for (CourseMaterial m : materials) {
                results.add(CourseMaterialResponse.builder()
                        .id(m.getId())
                        .sectionId(m.getSection().getId())
                        .courseName(m.getSection().getCourse().getName())
                        .courseCode(m.getSection().getCourse().getCode())
                        .title(m.getTitle())
                        .description(m.getDescription())
                        .materialType(m.getMaterialType())
                        .fileName(m.getFileName())
                        .hasFile(m.getFilePath() != null && !m.getFilePath().isBlank())
                        .createdAt(m.getCreatedAt())
                        .build());
            }
        }
        return results;
    }

    /**
     * Download a course material file from S3.
     * Student must be enrolled in the material's section.
     */
    public byte[] downloadMaterialFile(String email, Long materialId) throws IOException {
        StudentProfile student = getStudentByEmail(email);
        CourseMaterial material = courseMaterialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Course material not found: " + materialId));

        boolean enrolled = enrollmentRepository.existsByStudentIdAndSectionId(
                student.getId(), material.getSection().getId());
        if (!enrolled) {
            throw new BadRequestException("You are not enrolled in this material's course.");
        }

        if (material.getFilePath() == null || material.getFilePath().isBlank()) {
            throw new BadRequestException("No file attached to this course material.");
        }
        return s3StorageService.download(materialBucket, material.getFilePath());
    }

    // ==================== Helpers ====================

    private StudentProfile getStudentByEmail(String email) {
        User user = getUserByEmail(email);
        return studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user: " + email));
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private List<Enrollment> getEnrollments(StudentProfile student, Long semesterId) {
        if (semesterId != null) {
            return enrollmentRepository.findByStudentIdAndSectionSemesterId(student.getId(), semesterId);
        }
        // Default to active enrollments (current semester)
        return enrollmentRepository.findByStudentIdAndStatus(student.getId(), EnrollmentStatus.ACTIVE);
    }
}
