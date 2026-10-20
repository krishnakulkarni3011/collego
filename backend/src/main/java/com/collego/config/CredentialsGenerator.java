package com.collego.config;

import com.collego.entity.*;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.FileWriter;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(3) // Run after AcademicDataSeeder
@SuppressWarnings("null")
public class CredentialsGenerator implements CommandLineRunner {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;

    @Value("${collego.credentials.output-path:credentials.txt}")
    private String outputPath;

    @Override
    @Transactional(readOnly = true)
    public void run(String... args) {
        log.info("=== Generating Credentials File ===");

        StringBuilder sb = new StringBuilder();
        sb.append("COLLEGO CREDENTIALS\n");
        sb.append("===================\n\n");

        // Admin credentials
        sb.append("ADMIN:\n");
        sb.append("  Email: admin@collego.edu\n");
        sb.append("  Password: Admin@123\n\n");

        // Faculty credentials (7 authentic faculty)
        sb.append("FACULTY (CSE Department):\n");
        List<FacultyProfile> facultyList = facultyProfileRepository.findByDepartmentCode("CSE");
        for (FacultyProfile faculty : facultyList) {
            User user = faculty.getUser();
            sb.append(String.format("  Name: %s %s\n", user.getFirstName(), user.getLastName()));
            sb.append(String.format("  Email: %s\n", user.getEmail()));
            sb.append("  Password: Faculty@123\n");
            sb.append(String.format("  Employee ID: %s\n", faculty.getEmployeeId()));
            sb.append(String.format("  Designation: %s\n\n", faculty.getDesignation()));
        }

        // Student credentials (30 per year × 4 years = 120 students)
        sb.append("STUDENTS (CSE Department - 30 per year × 4 years = 120 total):\n");
        sb.append("  Login with USN (University Serial Number) as username\n");
        sb.append("  Default Password: Student@123\n\n");

        List<StudentProfile> students = studentProfileRepository.findByDepartmentCodeOrderByAdmissionYearAscEnrollmentNumberAsc("CSE");
        
        int currentYear = 0;
        for (StudentProfile student : students) {
            User user = student.getUser();
            int year = student.getAdmissionYear() - 2023; // Year 1, 2, 3, 4
            
            if (year != currentYear) {
                currentYear = year;
                sb.append(String.format("\n  --- Year %d (Semester %d-%d) ---\n", year, (year-1)*2+1, year*2));
            }
            
            sb.append(String.format("  USN: %s | Name: %s %s | Section: %s | Password: Student@123\n",
                    student.getEnrollmentNumber(),
                    user.getFirstName(),
                    user.getLastName(),
                    student.getSection()));
        }

        sb.append("\n\nNOTE:\n");
        sb.append("- Faculty login with email + password\n");
        sb.append("- Students login with USN + password\n");
        sb.append("- Admin login with email + password\n");
        sb.append("- All passwords can be changed after first login\n");

        try {
            // Ensure directory exists
            Files.createDirectories(Paths.get(outputPath).getParent());
            
            try (PrintWriter writer = new PrintWriter(new FileWriter(outputPath))) {
                writer.write(sb.toString());
            }
            log.info("Credentials file generated at: {}", Paths.get(outputPath).toAbsolutePath());
        } catch (Exception e) {
            log.error("Failed to write credentials file", e);
        }
    }
}