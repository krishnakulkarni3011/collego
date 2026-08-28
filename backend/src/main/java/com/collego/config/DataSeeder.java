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
        // Only seed if no admin exists
        if (!userRepository.existsByRole(Role.ADMIN)) {
            log.info("No admin account found. Seeding bootstrap admin...");

            User admin = User.builder()
                    .email(adminEmail)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .firstName(adminFirstName)
                    .lastName(adminLastName)
                    .role(Role.ADMIN)
                    .isActive(true)
                    .build();

            admin = userRepository.save(admin);

            AdminProfile profile = AdminProfile.builder()
                    .user(admin)
                    .adminLevel("SUPER_ADMIN")
                    .build();
            adminProfileRepository.save(profile);

            log.info("Bootstrap admin created: {} / {}", adminEmail, adminPassword);
        } else {
            log.info("Admin account already exists. Skipping seed.");
        }
    }
}
