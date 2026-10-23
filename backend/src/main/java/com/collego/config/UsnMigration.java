package com.collego.config;

import com.collego.entity.StudentProfile;
import com.collego.repository.StudentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * One-time, idempotent migration from the legacy {@code 1CG24CS001} USN scheme
 * to the college's official format:
 *
 * <pre>2BA 23 CS 001</pre>
 *
 * <ul>
 *   <li>{@code 2BA} – college code</li>
 *   <li>{@code 23} – year of admission (23 = Final Year, 24 = III, 25 = II, 26 = I)</li>
 *   <li>{@code CS} – department</li>
 *   <li>{@code 001} – student number, restarting at 001 for every academic year</li>
 * </ul>
 *
 * Existing academic records reference the student profile by id, so renaming a
 * USN keeps attendance, marks, assignments and enrollments intact.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(3) // after AcademicDataSeeder (2), before CredentialsGenerator (4)
@SuppressWarnings("null")
public class UsnMigration implements CommandLineRunner {

    private static final Pattern LEGACY_USN = Pattern.compile("^1CG\\d{2}CS(\\d{3})$");
    private static final int STUDENTS_PER_YEAR = 30;
    private static final int CURRENT_ACADEMIC_YEAR = 2027; // 2026-27 session

    private final StudentProfileRepository studentProfileRepository;

    @Override
    @Transactional
    public void run(String... args) {
        List<StudentProfile> students = studentProfileRepository.findAll();
        int updated = 0;

        for (StudentProfile student : students) {
            String usn = student.getEnrollmentNumber();
            if (usn == null) continue;

            Matcher matcher = LEGACY_USN.matcher(usn.trim());
            if (!matcher.matches()) continue;

            int globalNumber = Integer.parseInt(matcher.group(1));
            if (globalNumber < 1) continue;

            int year = (globalNumber - 1) / STUDENTS_PER_YEAR + 1;
            if (year > 4) continue;
            int studentNumber = (globalNumber - 1) % STUDENTS_PER_YEAR + 1;
            int admissionYear = CURRENT_ACADEMIC_YEAR - year;

            student.setEnrollmentNumber(String.format("2BA%02dCS%03d", admissionYear % 100, studentNumber));
            student.setAdmissionYear(admissionYear);
            studentProfileRepository.save(student);
            updated++;
        }

        if (updated > 0) {
            log.info("Migrated {} student USN(s) to the 2BA<YY>CS<NNN> format.", updated);
        }
    }
}
