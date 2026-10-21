package com.collego.config;

import com.collego.entity.*;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(3) // Run after AcademicDataSeeder
@SuppressWarnings("null")
public class CredentialsGenerator implements CommandLineRunner {

    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;

    @Override
    @Transactional(readOnly = true)
    public void run(String... args) {
        log.info("=== COLLEGO CREDENTIALS ===");

        // Admin credentials
        log.info("ADMIN:");
        log.info("  Email: admin@collego.edu");
        log.info("  Password: Admin@123");

        // Faculty credentials (7 authentic faculty)
        log.info("\nFACULTY (CSE Department):");
        List<FacultyProfile> facultyList = facultyProfileRepository.findByDepartmentCode("CSE");
        for (FacultyProfile faculty : facultyList) {
            User user = faculty.getUser();
            log.info("  Name: {} {} | Email: {} | Password: Faculty@123 | Employee ID: {} | Designation: {}",
                    user.getFirstName(), user.getLastName(), user.getEmail(),
                    faculty.getEmployeeId(), faculty.getDesignation());
        }

        // Student credentials (30 per year × 4 years = 120 students)
        log.info("\nSTUDENTS (CSE Department - 30 per year × 4 years = 120 total):");
        log.info("  Login with USN (University Serial Number) as username");
        log.info("  Default Password: Student@123");

        List<StudentProfile> students = studentProfileRepository.findByDepartmentCodeOrderByAdmissionYearAscEnrollmentNumberAsc("CSE");
        
        int currentYear = 0;
        for (StudentProfile student : students) {
            User user = student.getUser();
            Integer admissionYear = student.getAdmissionYear();
            int year = (admissionYear != null) ? (admissionYear - 2023) : 1; // Year 1, 2, 3, 4
            
            if (year != currentYear) {
                currentYear = year;
                log.info("\n  --- Year {} (Semester {}-{}) ---", year, (year-1)*2+1, year*2);
            }
            
            log.info("  USN: {} | Name: {} {} | Section: {} | Password: Student@123",
                    student.getEnrollmentNumber(),
                    user.getFirstName(),
                    user.getLastName(),
                    student.getSection());
        }

        log.info("\n\nNOTE:");
        log.info("- Faculty login with email + password");
        log.info("- Students login with USN + password");
        log.info("- Admin login with email + password");
        log.info("- All passwords can be changed after first login");
    }
}