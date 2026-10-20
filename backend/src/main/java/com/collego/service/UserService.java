package com.collego.service;

import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.exception.*;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class UserService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

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

        return getUserById(user.getId());
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
                                String designation, String resumeFileName, boolean hasResume) {}

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
                            null, null, null, null, false))
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
                            p.getResumePath() != null && !p.getResumePath().isBlank()))
                    .orElse(emptyExtra());
        }
        return emptyExtra();
    }

    private ProfileExtra emptyExtra() {
        return new ProfileExtra(null, null, null, null, null, null, null, null, null, null, null, false);
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
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt() : java.time.LocalDateTime.now())
                .build();
    }
}
