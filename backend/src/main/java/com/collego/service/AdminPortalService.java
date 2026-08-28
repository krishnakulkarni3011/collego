package com.collego.service;

import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.exception.ConflictException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminPortalService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final DepartmentRepository departmentRepository;
    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final SemesterMarksRepository semesterMarksRepository;
    private final QuestionPaperRepository questionPaperRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final QuestionPaperService questionPaperService;

    // ==================== User Edit ====================

    @Transactional
    public UserResponse updateUser(Long userId, UpdateUserRequest request, String adminEmail, String ipAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (user.getRole() == Role.ADMIN) {
            throw new BadRequestException("Cannot edit ADMIN accounts.");
        }

        if (request.getFirstName() != null && !request.getFirstName().isBlank()) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null && !request.getLastName().isBlank()) {
            user.setLastName(request.getLastName());
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            if (!request.getEmail().equals(user.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
                throw new ConflictException("Email already in use: " + request.getEmail());
            }
            user.setEmail(request.getEmail());
        }
        userRepository.save(user);

        // Update department if provided
        if (request.getDepartmentId() != null) {
            Department department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + request.getDepartmentId()));

            if (user.getRole() == Role.STUDENT) {
                studentProfileRepository.findByUserId(userId).ifPresent(p -> {
                    p.setDepartment(department);
                    studentProfileRepository.save(p);
                });
            } else if (user.getRole() == Role.FACULTY) {
                facultyProfileRepository.findByUserId(userId).ifPresent(p -> {
                    p.setDepartment(department);
                    facultyProfileRepository.save(p);
                });
            }
        }

        auditService.log(null, adminEmail, "USER_UPDATED", "User", userId,
                "Updated user: " + user.getEmail(), ipAddress);

        return buildUserResponse(user);
    }

    // ==================== CSV Bulk Import ====================

    @Transactional
    public BulkImportResponse bulkImportUsers(MultipartFile file, String adminEmail, String ipAddress) {
        List<String> errors = new ArrayList<>();
        int success = 0;
        int total = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String headerLine = reader.readLine(); // Skip CSV header
            if (headerLine == null) {
                throw new BadRequestException("CSV file is empty");
            }

            String line;
            int lineNum = 1;
            while ((line = reader.readLine()) != null) {
                lineNum++;
                total++;
                try {
                    String[] parts = line.split(",", -1);
                    if (parts.length < 5) {
                        errors.add("Line " + lineNum + ": Expected at least 5 columns (email,password,firstName,lastName,role[,departmentCode])");
                        continue;
                    }

                    String email = parts[0].trim();
                    String password = parts[1].trim();
                    String firstName = parts[2].trim();
                    String lastName = parts[3].trim();
                    String roleStr = parts[4].trim().toUpperCase();
                    String deptCode = parts.length > 5 ? parts[5].trim() : null;

                    if (userRepository.existsByEmail(email)) {
                        errors.add("Line " + lineNum + ": Email already exists: " + email);
                        continue;
                    }

                    Role role;
                    try {
                        role = Role.valueOf(roleStr);
                    } catch (IllegalArgumentException e) {
                        errors.add("Line " + lineNum + ": Invalid role: " + roleStr);
                        continue;
                    }

                    if (role == Role.ADMIN) {
                        errors.add("Line " + lineNum + ": Cannot bulk-create ADMIN accounts");
                        continue;
                    }

                    User user = User.builder()
                            .email(email)
                            .passwordHash(passwordEncoder.encode(password))
                            .firstName(firstName)
                            .lastName(lastName)
                            .role(role)
                            .isActive(true)
                            .build();
                    user = userRepository.save(user);

                    Department department = null;
                    if (deptCode != null && !deptCode.isEmpty()) {
                        department = departmentRepository.findByCode(deptCode).orElse(null);
                        if (department == null) {
                            errors.add("Line " + lineNum + ": Department not found: " + deptCode + " (user created without department)");
                        }
                    }

                    if (role == Role.STUDENT) {
                        StudentProfile profile = StudentProfile.builder()
                                .user(user).department(department).build();
                        studentProfileRepository.save(profile);
                    } else if (role == Role.FACULTY) {
                        FacultyProfile profile = FacultyProfile.builder()
                                .user(user).department(department).build();
                        facultyProfileRepository.save(profile);
                    }

                    success++;
                } catch (Exception e) {
                    errors.add("Line " + lineNum + ": " + e.getMessage());
                }
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Failed to parse CSV: " + e.getMessage());
        }

        auditService.log(null, adminEmail, "BULK_IMPORT", null, null,
                "Bulk imported " + success + "/" + total + " users", ipAddress);

        log.info("Admin {} bulk imported {}/{} users", adminEmail, success, total);

        return BulkImportResponse.builder()
                .totalProcessed(total)
                .successCount(success)
                .failureCount(total - success)
                .errors(errors)
                .build();
    }

    // ==================== System Overview ====================

    public SystemOverviewResponse getSystemOverview() {
        long totalStudents = userRepository.findByRole(Role.STUDENT).size();
        long totalFaculty = userRepository.findByRole(Role.FACULTY).size();
        long totalDepartments = departmentRepository.count();
        long totalCourses = courseRepository.count();
        long totalSections = sectionRepository.count();
        long totalEnrollments = enrollmentRepository.count();
        long pendingQPs = questionPaperRepository.countByStatus("PENDING");

        // Overall attendance
        double overallAttendance = calculateOverallAttendance();

        // Overall pass %
        double overallPass = calculateOverallPassPercentage();

        return SystemOverviewResponse.builder()
                .totalStudents(totalStudents)
                .totalFaculty(totalFaculty)
                .totalDepartments(totalDepartments)
                .totalCourses(totalCourses)
                .totalSections(totalSections)
                .totalEnrollments(totalEnrollments)
                .pendingQuestionPapers(pendingQPs)
                .overallAverageAttendance(overallAttendance)
                .overallPassPercentage(overallPass)
                .build();
    }

    // ==================== Department Reports ====================

    public List<DepartmentReportResponse> getDepartmentReports() {
        List<Department> departments = departmentRepository.findAll();
        return departments.stream().map(dept -> {
            long totalStudents = studentProfileRepository.countByDepartmentId(dept.getId());
            long totalFaculty = facultyProfileRepository.countByDepartmentId(dept.getId());
            long totalCourses = courseRepository.findByDepartmentId(dept.getId()).size();

            List<Course> courses = courseRepository.findByDepartmentId(dept.getId());
            List<Long> sectionIds = new ArrayList<>();
            for (Course course : courses) {
                sectionRepository.findByCourseId(course.getId())
                        .forEach(s -> sectionIds.add(s.getId()));
            }
            long totalSections = sectionIds.size();

            double avgAttendance = calculateDepartmentAttendance(dept.getId());
            double avgPass = calculateDepartmentPassPercentage(sectionIds);

            return DepartmentReportResponse.builder()
                    .departmentId(dept.getId())
                    .departmentName(dept.getName())
                    .departmentCode(dept.getCode())
                    .totalStudents(totalStudents)
                    .totalFaculty(totalFaculty)
                    .totalCourses(totalCourses)
                    .totalSections(totalSections)
                    .averageAttendance(round(avgAttendance))
                    .averagePassPercentage(round(avgPass))
                    .averageCgpa(null) // Requires full CGPA computation; deferred
                    .build();
        }).collect(Collectors.toList());
    }

    // ==================== Subject-wise Reports ====================

    public List<SubjectReportResponse> getSubjectReports(Long departmentId) {
        List<Course> courses;
        if (departmentId != null) {
            courses = courseRepository.findByDepartmentId(departmentId);
        } else {
            courses = courseRepository.findAll();
        }

        List<SubjectReportResponse> results = new ArrayList<>();

        for (Course course : courses) {
            List<Section> sections = sectionRepository.findByCourseId(course.getId());
            for (Section section : sections) {
                List<SemesterMarks> marks = semesterMarksRepository.findBySectionId(section.getId());
                List<Enrollment> enrollments = enrollmentRepository.findBySectionId(section.getId());

                long totalEnrolled = enrollments.size();
                long totalPassed = marks.stream().filter(m -> m.getGrade() != null && !"F".equals(m.getGrade())).count();
                long totalFailed = marks.stream().filter(m -> "F".equals(m.getGrade())).count();
                double passPct = marks.isEmpty() ? 0 : (totalPassed * 100.0) / marks.size();

                Double avgMarks = marks.isEmpty() ? null :
                        marks.stream().mapToDouble(SemesterMarks::getObtainedMarks).average().orElse(0);
                Double maxMarks = marks.isEmpty() ? null : marks.get(0).getMaxMarks();

                double avgAttendance = calculateSectionAttendance(section.getId(), enrollments);

                String facultyName = null;
                if (section.getFaculty() != null) {
                    User fUser = section.getFaculty().getUser();
                    facultyName = fUser.getFirstName() + " " + fUser.getLastName();
                }

                results.add(SubjectReportResponse.builder()
                        .sectionId(section.getId())
                        .courseName(course.getName())
                        .courseCode(course.getCode())
                        .sectionName(section.getName())
                        .facultyName(facultyName)
                        .departmentName(course.getDepartment().getName())
                        .totalEnrolled(totalEnrolled)
                        .totalPassed(totalPassed)
                        .totalFailed(totalFailed)
                        .passPercentage(round(passPct))
                        .averageMarks(avgMarks != null ? round(avgMarks) : null)
                        .maxMarks(maxMarks)
                        .averageAttendance(round(avgAttendance))
                        .build());
            }
        }

        return results;
    }

    // ==================== Backlog Analysis ====================

    public BacklogReportResponse getBacklogReport(Long departmentId) {
        List<SemesterMarks> allFailures = semesterMarksRepository.findAll().stream()
                .filter(m -> "F".equals(m.getGrade()))
                .collect(Collectors.toList());

        // Group by student
        Map<Long, List<SemesterMarks>> byStudent = allFailures.stream()
                .collect(Collectors.groupingBy(m -> m.getStudent().getId()));

        List<BacklogReportResponse.StudentBacklogEntry> entries = new ArrayList<>();
        long totalBacklogs = 0;

        for (Map.Entry<Long, List<SemesterMarks>> entry : byStudent.entrySet()) {
            StudentProfile student = entry.getValue().get(0).getStudent();
            User sUser = student.getUser();

            // Filter by department if specified
            if (departmentId != null && (student.getDepartment() == null ||
                    !student.getDepartment().getId().equals(departmentId))) {
                continue;
            }

            List<BacklogReportResponse.BacklogCourse> backlogCourses = entry.getValue().stream()
                    .map(m -> BacklogReportResponse.BacklogCourse.builder()
                            .courseName(m.getSection().getCourse().getName())
                            .courseCode(m.getSection().getCourse().getCode())
                            .grade(m.getGrade())
                            .obtainedMarks(m.getObtainedMarks())
                            .maxMarks(m.getMaxMarks())
                            .build())
                    .collect(Collectors.toList());

            totalBacklogs += backlogCourses.size();

            entries.add(BacklogReportResponse.StudentBacklogEntry.builder()
                    .studentId(student.getId())
                    .enrollmentNumber(student.getEnrollmentNumber())
                    .studentName(sUser.getFirstName() + " " + sUser.getLastName())
                    .departmentName(student.getDepartment() != null ? student.getDepartment().getName() : "N/A")
                    .backlogCount(backlogCourses.size())
                    .backlogCourses(backlogCourses)
                    .build());
        }

        // Sort by backlog count descending
        entries.sort((a, b) -> Integer.compare(b.getBacklogCount(), a.getBacklogCount()));

        return BacklogReportResponse.builder()
                .totalStudentsWithBacklogs(entries.size())
                .totalBacklogInstances(totalBacklogs)
                .students(entries)
                .build();
    }

    // ==================== Attendance Summary ====================

    public List<AttendanceSummaryResponse> getAttendanceSummary() {
        List<Department> departments = departmentRepository.findAll();

        return departments.stream().map(dept -> {
            List<StudentProfile> students = studentProfileRepository.findByDepartmentId(dept.getId());
            long totalStudents = students.size();

            double totalPct = 0;
            long above75 = 0, below75 = 0, below50 = 0;

            for (StudentProfile student : students) {
                List<Enrollment> enrollments = enrollmentRepository.findByStudentId(student.getId());
                double studentPct = calculateStudentOverallAttendance(student.getId(), enrollments);

                totalPct += studentPct;
                if (studentPct >= 75) above75++;
                else if (studentPct >= 50) below75++;
                else below50++;
            }

            double avgPct = totalStudents > 0 ? totalPct / totalStudents : 0;

            return AttendanceSummaryResponse.builder()
                    .departmentId(dept.getId())
                    .departmentName(dept.getName())
                    .totalStudents(totalStudents)
                    .averageAttendancePercentage(round(avgPct))
                    .studentsAbove75(above75)
                    .studentsBelow75(below75)
                    .studentsBelow50(below50)
                    .build();
        }).collect(Collectors.toList());
    }

    // ==================== Question Paper Approval ====================

    public List<QuestionPaperResponse> getPendingQuestionPapers() {
        return questionPaperRepository.findByStatus("PENDING").stream()
                .map(this::mapQpToResponse)
                .collect(Collectors.toList());
    }

    public List<QuestionPaperResponse> getAllQuestionPapers() {
        return questionPaperRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapQpToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public QuestionPaperResponse approveQuestionPaper(Long qpId, String adminEmail, String ipAddress) {
        QuestionPaper qp = questionPaperRepository.findById(qpId)
                .orElseThrow(() -> new ResourceNotFoundException("Question paper not found: " + qpId));

        if (!"PENDING".equals(qp.getStatus())) {
            throw new BadRequestException("Question paper is already " + qp.getStatus());
        }

        qp.setStatus("APPROVED");
        questionPaperRepository.save(qp);

        auditService.log(null, adminEmail, "QP_APPROVED", "QuestionPaper", qpId,
                "Approved question paper for " + qp.getCourse().getName(), ipAddress);

        log.info("Admin {} approved question paper {}", adminEmail, qpId);

        return mapQpToResponse(qp);
    }

    @Transactional
    public QuestionPaperResponse rejectQuestionPaper(Long qpId, String adminEmail, String ipAddress) {
        QuestionPaper qp = questionPaperRepository.findById(qpId)
                .orElseThrow(() -> new ResourceNotFoundException("Question paper not found: " + qpId));

        if (!"PENDING".equals(qp.getStatus())) {
            throw new BadRequestException("Question paper is already " + qp.getStatus());
        }

        qp.setStatus("REJECTED");
        questionPaperRepository.save(qp);

        auditService.log(null, adminEmail, "QP_REJECTED", "QuestionPaper", qpId,
                "Rejected question paper for " + qp.getCourse().getName(), ipAddress);

        log.info("Admin {} rejected question paper {}", adminEmail, qpId);

        return mapQpToResponse(qp);
    }

    // ==================== Backup Trigger (Stub) ====================

    public Map<String, Object> triggerBackup(String adminEmail, String ipAddress) {
        // Stub — actual S3 integration comes in Phase 8
        String timestamp = LocalDateTime.now().toString();
        String backupId = "backup-" + System.currentTimeMillis();

        auditService.log(null, adminEmail, "BACKUP_TRIGGERED", null, null,
                "Database backup triggered: " + backupId, ipAddress);

        log.info("Admin {} triggered backup: {}", adminEmail, backupId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("backupId", backupId);
        result.put("status", "INITIATED");
        result.put("timestamp", timestamp);
        result.put("message", "Backup initiated. S3 upload will be enabled in Phase 8.");
        result.put("note", "Currently a stub — no actual dump performed. Wire to pg_dump + S3 in Phase 8.");
        return result;
    }

    // ==================== Helpers ====================

    private double calculateOverallAttendance() {
        List<Enrollment> allEnrollments = enrollmentRepository.findAll();
        if (allEnrollments.isEmpty()) return 0;

        double totalPct = 0;
        int count = 0;

        // Group by student to avoid double-counting
        Map<Long, List<Enrollment>> byStudent = allEnrollments.stream()
                .collect(Collectors.groupingBy(e -> e.getStudent().getId()));

        for (Map.Entry<Long, List<Enrollment>> entry : byStudent.entrySet()) {
            double pct = calculateStudentOverallAttendance(entry.getKey(), entry.getValue());
            totalPct += pct;
            count++;
        }

        return count > 0 ? totalPct / count : 0;
    }

    private double calculateStudentOverallAttendance(Long studentId, List<Enrollment> enrollments) {
        long totalClasses = 0, totalPresent = 0;
        for (Enrollment enrollment : enrollments) {
            long classes = attendanceRepository.countByStudentIdAndSectionId(studentId, enrollment.getSection().getId());
            long present = attendanceRepository.countByStudentIdAndSectionIdAndStatus(
                    studentId, enrollment.getSection().getId(), AttendanceStatus.PRESENT);
            totalClasses += classes;
            totalPresent += present;
        }
        return totalClasses > 0 ? (totalPresent * 100.0) / totalClasses : 0;
    }

    private double calculateOverallPassPercentage() {
        List<SemesterMarks> allMarks = semesterMarksRepository.findAll();
        if (allMarks.isEmpty()) return 0;
        long passed = allMarks.stream().filter(m -> m.getGrade() != null && !"F".equals(m.getGrade())).count();
        return (passed * 100.0) / allMarks.size();
    }

    private double calculateDepartmentAttendance(Long departmentId) {
        List<StudentProfile> students = studentProfileRepository.findByDepartmentId(departmentId);
        if (students.isEmpty()) return 0;

        double totalPct = 0;
        for (StudentProfile student : students) {
            List<Enrollment> enrollments = enrollmentRepository.findByStudentId(student.getId());
            totalPct += calculateStudentOverallAttendance(student.getId(), enrollments);
        }
        return totalPct / students.size();
    }

    private double calculateDepartmentPassPercentage(List<Long> sectionIds) {
        if (sectionIds.isEmpty()) return 0;

        long total = 0, passed = 0;
        for (Long sectionId : sectionIds) {
            List<SemesterMarks> marks = semesterMarksRepository.findBySectionId(sectionId);
            total += marks.size();
            passed += marks.stream().filter(m -> m.getGrade() != null && !"F".equals(m.getGrade())).count();
        }
        return total > 0 ? (passed * 100.0) / total : 0;
    }

    private double calculateSectionAttendance(Long sectionId, List<Enrollment> enrollments) {
        if (enrollments.isEmpty()) return 0;

        double totalPct = 0;
        for (Enrollment enrollment : enrollments) {
            long total = attendanceRepository.countByStudentIdAndSectionId(enrollment.getStudent().getId(), sectionId);
            long present = attendanceRepository.countByStudentIdAndSectionIdAndStatus(
                    enrollment.getStudent().getId(), sectionId, AttendanceStatus.PRESENT);
            double pct = total > 0 ? (present * 100.0) / total : 0;
            totalPct += pct;
        }
        return totalPct / enrollments.size();
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private UserResponse buildUserResponse(User user) {
        String deptName = null;
        if (user.getRole() == Role.STUDENT) {
            deptName = studentProfileRepository.findByUserId(user.getId())
                    .map(p -> p.getDepartment() != null ? p.getDepartment().getName() : null).orElse(null);
        } else if (user.getRole() == Role.FACULTY) {
            deptName = facultyProfileRepository.findByUserId(user.getId())
                    .map(p -> p.getDepartment() != null ? p.getDepartment().getName() : null).orElse(null);
        }

        return UserResponse.builder()
                .id(user.getId()).email(user.getEmail())
                .firstName(user.getFirstName()).lastName(user.getLastName())
                .role(user.getRole().name()).active(user.isActive())
                .departmentName(deptName).createdAt(user.getCreatedAt())
                .build();
    }

    private QuestionPaperResponse mapQpToResponse(QuestionPaper qp) {
        return questionPaperService.mapToResponse(qp);
    }
}
