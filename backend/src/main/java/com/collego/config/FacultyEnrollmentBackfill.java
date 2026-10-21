package com.collego.config;

import com.collego.service.FacultyPortalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Ensures existing faculty subject assignments also get the students from their
 * academic year after the year-based enrollment feature is deployed.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(4) // Run after AcademicDataSeeder and CredentialsGenerator
public class FacultyEnrollmentBackfill implements CommandLineRunner {

    private final FacultyPortalService facultyPortalService;

    @Override
    public void run(String... args) {
        try {
            facultyPortalService.backfillStudentEnrollmentsForActiveAssignments();
        } catch (Exception e) {
            log.warn("Faculty student enrollment backfill skipped: {}", e.getMessage(), e);
        }
    }
}
