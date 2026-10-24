package com.collego.service;

import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.exception.*;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class UserService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final EmailService emailService;

    @Transactional
    public UserResponse createUser(CreateUserRequest request, String adminEmail, String ipAddress) {
        // Validate role
        Role role;
        try {
            role = Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + request.getRole() + ". Must be STUDENT or FACULTY.");
        }

        if (role == Role.ADMIN) {
            throw new BadRequestException("Cannot create ADMIN accounts through this endpoint.");
        }

        // Check email uniqueness
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already exists: " + request.getEmail());
        }

        // Create user
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(role)
                .isActive(true)
                .build();
        user = userRepository.save(user);

        // Create role-specific profile
        Department department = null;
        if (request.getDepartmentId() != null) {
            department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + request.getDepartmentId()));
        }

        if (role == Role.STUDENT) {
            StudentProfile profile = StudentProfile.builder()
                    .user(user)
                    .department(department)
                    .enrollmentNumber(request.getEnrollmentNumber())
                    .semester(request.getSemester())
                    .section(request.getSection())
                    .admissionYear(request.getAdmissionYear())
                    .build();
            studentProfileRepository.save(profile);
        } else if (role == Role.FACULTY) {
            FacultyProfile profile = FacultyProfile.builder()
                    .user(user)
                    .department(department)
                    .employeeId(request.getEmployeeId())
                    .designation(request.getDesignation())
                    .build();
            facultyProfileRepository.save(profile);
        }

        // Audit log
        auditService.log(null, adminEmail, "USER_CREATED", "User", user.getId(),
                "Created " + role + " account: " + user.getEmail(), ipAddress);

        // Email the credentials to the address the admin entered. EmailService
        // never throws, so a mail outage cannot roll back the new account.
        sendAccountEmail(user, role, department, request);

        return getUserById(user.getId());
    }

    /**
     * Sends the details entered by the admin plus the temporary password and a
     * link to the portal, so the new student or faculty member can sign in.
     */
    private void sendAccountEmail(User user, Role role, Department department, CreateUserRequest request) {
        String fullName = (user.getFirstName() + " " + user.getLastName()).trim();
        boolean isStudent = role == Role.STUDENT;
        String departmentName = department != null ? department.getName() : "—";

        StringBuilder body = new StringBuilder();
        body.append("Hello ").append(fullName).append(",\n\n")
                .append("Your Collego ").append(isStudent ? "student" : "faculty")
                .append(" account has been created by the administration.\n\n")
                .append("ACCOUNT DETAILS\n")
                .append("---------------\n")
                .append("Name: ").append(fullName).append('\n')
                .append("Role: ").append(isStudent ? "Student" : "Faculty").append('\n')
                .append("Email: ").append(user.getEmail()).append('\n');

        if (isStudent) {
            body.append("USN: ").append(display(request.getEnrollmentNumber())).append('\n')
                    .append("Department: ").append(departmentName).append('\n')
                    .append("Semester: ").append(display(request.getSemester())).append('\n')
                    .append("Section: ").append(display(request.getSection())).append('\n')
                    .append("Admission year: ").append(display(request.getAdmissionYear())).append('\n');
        } else {
            body.append("Employee ID: ").append(display(request.getEmployeeId())).append('\n')
                    .append("Designation: ").append(display(request.getDesignation())).append('\n')
                    .append("Department: ").append(departmentName).append('\n');
        }

        body.append("Temporary password: ").append(request.getPassword()).append("\n\n")
                .append("SIGN IN\n")
                .append("-------\n")
                .append(emailService.frontendUrl()).append('\n')
                .append(isStudent
                        ? "Use your USN or email above with the temporary password.\n"
                        : "Use your email above with the temporary password.\n")
                .append("You can change this password after signing in from Settings.\n\n")
                .append("Regards,\n")
                .append("Collego Administration\n");

        emailService.send(
                user.getEmail(),
                "Your Collego account is ready",
                body.toString());
    }

    private String display(Object value) {
        if (value == null) return "—";
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? "—" : text;
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> mapToUserResponse(user, getProfileExtra(user)))
                .collect(Collectors.toList());
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return mapToUserResponse(user, getProfileExtra(user));
    }

    @Transactional
    public UserResponse deactivateUser(Long id, String adminEmail, String ipAddress) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (user.getRole() == Role.ADMIN) {
            throw new BadRequestException("Cannot deactivate an ADMIN account.");
        }

        user.setActive(false);
        user.setRefreshToken(null); // Invalidate sessions
        userRepository.save(user);

        auditService.log(null, adminEmail, "USER_DEACTIVATED", "User", user.getId(),
                "Deactivated account: " + user.getEmail(), ipAddress);

        return mapToUserResponse(user, getProfileExtra(user));
    }

    @Transactional
    public UserResponse activateUser(Long id, String adminEmail, String ipAddress) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        user.setActive(true);
        userRepository.save(user);

        auditService.log(null, adminEmail, "USER_ACTIVATED", "User", user.getId(),
                "Activated account: " + user.getEmail(), ipAddress);

        return mapToUserResponse(user, getProfileExtra(user));
    }

    // ── helper: carries dept name + student-specific fields ──────────────────
    private record ProfileExtra(Long departmentId, String departmentName, String departmentCode,
                                String enrollmentNumber, Integer semester, String section,
                                Integer admissionYear, Long facultyProfileId, String employeeId,
                                String designation, String resumeFileName, boolean hasResume,
                                String resumeStatus) {}

    private ProfileExtra getProfileExtra(User user) {
        if (user.getRole() == Role.STUDENT) {
            return studentProfileRepository.findByUserId(user.getId())
                    .map(p -> new ProfileExtra(
                            p.getDepartment() != null ? p.getDepartment().getId() : null,
                            p.getDepartment() != null ? p.getDepartment().getName() : null,
                            p.getDepartment() != null ? p.getDepartment().getCode() : null,
                            p.getEnrollmentNumber(),
                            p.getSemester(),
                            p.getSection(),
                            p.getAdmissionYear(),
                            null, null, null, null, false, null))
                    .orElse(emptyExtra());
        }
        if (user.getRole() == Role.FACULTY) {
            return facultyProfileRepository.findByUserId(user.getId())
                    .map(p -> new ProfileExtra(
                            p.getDepartment() != null ? p.getDepartment().getId() : null,
                            p.getDepartment() != null ? p.getDepartment().getName() : null,
                            p.getDepartment() != null ? p.getDepartment().getCode() : null,
                            null, null, null, null, p.getId(),
                            p.getEmployeeId(),
                            p.getDesignation(),
                            p.getResumeFileName(),
                            p.getResumePath() != null && !p.getResumePath().isBlank(),
                            resolveResumeStatus(p)))
                    .orElse(emptyExtra());
        }
        return emptyExtra();
    }

    static String resolveResumeStatus(com.collego.entity.FacultyProfile profile) {
        if (profile.getResumePath() == null || profile.getResumePath().isBlank()) return "NONE";
        return profile.getResumeStatus() != null ? profile.getResumeStatus() : "APPROVED";
    }

    private ProfileExtra emptyExtra() {
        return new ProfileExtra(null, null, null, null, null, null, null, null, null, null, null, false, null);
    }

    private UserResponse mapToUserResponse(User user, ProfileExtra extra) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .active(user.isActive())
                .departmentId(extra.departmentId())
                .departmentName(extra.departmentName())
                .departmentCode(extra.departmentCode())
                .enrollmentNumber(extra.enrollmentNumber())
                .semester(extra.semester())
                .section(extra.section())
                .admissionYear(extra.admissionYear())
                .facultyProfileId(extra.facultyProfileId())
                .employeeId(extra.employeeId())
                .designation(extra.designation())
                .resumeFileName(extra.resumeFileName())
                .hasResume(extra.hasResume())
                .resumeStatus(extra.resumeStatus())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt() : java.time.LocalDateTime.now())
                .build();
    }
}
