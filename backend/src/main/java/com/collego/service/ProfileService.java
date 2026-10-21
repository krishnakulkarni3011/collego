package com.collego.service;

import com.collego.dto.ChangePasswordRequest;
import com.collego.dto.UpdateProfileRequest;
import com.collego.dto.UserProfileResponse;
import com.collego.entity.User;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.StudentProfileRepository;
import com.collego.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Self-service profile and password management for every role.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class ProfileService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public UserProfileResponse getProfile(String email) {
        User user = getUser(email);

        UserProfileResponse.UserProfileResponseBuilder builder = UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .role(user.getRole().name());

        if (user.getRole() == com.collego.entity.Role.STUDENT) {
            studentProfileRepository.findByUserId(user.getId()).ifPresent(sp -> builder
                    .enrollmentNumber(sp.getEnrollmentNumber())
                    .departmentName(sp.getDepartment() != null ? sp.getDepartment().getName() : null)
                    .departmentCode(sp.getDepartment() != null ? sp.getDepartment().getCode() : null)
                    .currentSemester(sp.getSemester())
                    .section(sp.getSection())
                    .admissionYear(sp.getAdmissionYear()));
        } else if (user.getRole() == com.collego.entity.Role.FACULTY) {
            facultyProfileRepository.findByUserId(user.getId()).ifPresent(fp -> builder
                    .employeeId(fp.getEmployeeId())
                    .designation(fp.getDesignation())
                    .departmentName(fp.getDepartment() != null ? fp.getDepartment().getName() : null)
                    .departmentCode(fp.getDepartment() != null ? fp.getDepartment().getCode() : null));
        }

        return builder.build();
    }

    @Transactional
    public UserProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = getUser(email);
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setPhone(request.getPhone() != null && !request.getPhone().isBlank()
                ? request.getPhone().trim() : null);
        userRepository.save(user);
        return getProfile(email);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = getUser(email);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect.");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BadRequestException("New password must be different from the current password.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        // Force re-login everywhere by invalidating the stored refresh token.
        user.setRefreshToken(null);
        userRepository.save(user);

        log.info("Password changed for user {}", email);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
