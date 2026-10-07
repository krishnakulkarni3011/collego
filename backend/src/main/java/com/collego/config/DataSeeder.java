package com.collego.config;

import com.collego.entity.AdminProfile;
import com.collego.entity.Role;
import com.collego.entity.User;
import com.collego.repository.AdminProfileRepository;
import com.collego.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AdminProfileRepository adminProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${collego.admin.email}")
    private String adminEmail;

    @Value("${collego.admin.password}")
    private String adminPassword;

    @Value("${collego.admin.first-name}")
    private String adminFirstName;

    @Value("${collego.admin.last-name}")
    private String adminLastName;

    @Override
    public void run(String... args) {
        String targetEmail = (adminEmail != null && !adminEmail.isBlank()) ? adminEmail.trim().toLowerCase() : "admin@collego.edu";
        String targetPassword = (adminPassword != null && !adminPassword.isBlank()) ? adminPassword.trim() : "Admin@123";

        User admin = userRepository.findByEmailIgnoreCase(targetEmail).orElse(null);

        if (admin == null) {
            log.info("No admin account found. Seeding bootstrap admin: {}", targetEmail);
            admin = User.builder()
                    .email(targetEmail)
                    .passwordHash(passwordEncoder.encode(targetPassword))
                    .firstName(adminFirstName != null ? adminFirstName : "System")
                    .lastName(adminLastName != null ? adminLastName : "Admin")
                    .role(Role.ADMIN)
                    .isActive(true)
                    .build();

            admin = userRepository.save(admin);

            AdminProfile profile = AdminProfile.builder()
                    .user(admin)
                    .adminLevel("SUPER_ADMIN")
                    .build();
            adminProfileRepository.save(profile);

            log.info("Bootstrap admin created: {} / {}", targetEmail, targetPassword);
        } else {
            // Ensure admin credentials match active configuration
            admin.setPasswordHash(passwordEncoder.encode(targetPassword));
            admin.setActive(true);
            userRepository.save(admin);
            log.info("Admin account verified/updated: {} / {}", targetEmail, targetPassword);
        }

        // Ensure demo student account exists and is active
        User studentUser = userRepository.findByEmailIgnoreCase("student1.cse@collego.edu").orElse(null);
        if (studentUser == null) {
            studentUser = User.builder()
                    .email("student1.cse@collego.edu")
                    .passwordHash(passwordEncoder.encode("Student@123"))
                    .firstName("Aarav")
                    .lastName("Sharma")
                    .role(Role.STUDENT)
                    .isActive(true)
                    .build();
            userRepository.save(studentUser);
            log.info("Seeded demo student user: student1.cse@collego.edu / Student@123");
        } else {
            studentUser.setPasswordHash(passwordEncoder.encode("Student@123"));
            studentUser.setActive(true);
            userRepository.save(studentUser);
            log.info("Demo student account verified/updated: student1.cse@collego.edu");
        }

        // Ensure demo faculty account exists and is active
        User facultyUser = userRepository.findByEmailIgnoreCase("faculty1.cse@collego.edu").orElse(null);
        if (facultyUser == null) {
            facultyUser = User.builder()
                    .email("faculty1.cse@collego.edu")
                    .passwordHash(passwordEncoder.encode("Faculty@123"))
                    .firstName("Dr. Rajesh")
                    .lastName("Kumar")
                    .role(Role.FACULTY)
                    .isActive(true)
                    .build();
            userRepository.save(facultyUser);
            log.info("Seeded demo faculty user: faculty1.cse@collego.edu / Faculty@123");
        } else {
            facultyUser.setPasswordHash(passwordEncoder.encode("Faculty@123"));
            facultyUser.setActive(true);
            userRepository.save(facultyUser);
            log.info("Demo faculty account verified/updated: faculty1.cse@collego.edu");
        }
    }
}
