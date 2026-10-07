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
    }
}
