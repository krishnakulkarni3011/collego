package com.collego.config;

import com.collego.entity.*;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(2) // Run after DataSeeder (which creates bootstrap admin)
@SuppressWarnings("null")
public class AcademicDataSeeder implements CommandLineRunner {

    private final DepartmentRepository departmentRepository;
    private final CourseRepository courseRepository;
    private final SemesterRepository semesterRepository;
    private final SectionRepository sectionRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final AttendanceRepository attendanceRepository;
    private final InternalMarksRepository internalMarksRepository;
    private final SemesterMarksRepository semesterMarksRepository;
    private final AdminProfileRepository adminProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${collego.admin.email:admin@collego.edu}")
    private String adminEmail;

    private static final int EXPECTED_STUDENT_COUNT = 120;
    private static final int EXPECTED_SEMESTER_COUNT = 8;

    /**
     * Companies used by the old placement-notice seeder. Production databases
     * created before placement drives became admin-managed can still contain
     * these rows; remove only the seed-shaped ones (no drive date, no file).
     */
    private static final String LEGACY_SEEDED_PLACEMENTS_SQL =
            "DELETE FROM placement_notices WHERE drive_date IS NULL AND attachment_path IS NULL "
                    + "AND company_name IN ('Google', 'Goldman Sachs', 'Amazon', 'Microsoft', 'Cisco')";

    /**
     * Sample notifications created by earlier versions of this seeder. They are
     * removed on startup so student/admin portals only show notices that were
     * actually sent through the application.
     */
    private static final String[][] SEEDED_NOTIFICATIONS = {
            {"Welcome to New Semester!", "Your semester classes have started. Check your timetable for schedule details."},
            {"Welcome to Semester 3!", "Your Semester 3 classes have started. Check your timetable for schedule details."},
            {"IA-1 Marks Published", "Internal Assessment 1 marks have been published. Check your marks section."},
            {"New Placement Drive", "A new placement drive has been announced. Check placement notices for details."},
            {"New Placement Drive", "Google is visiting campus soon. Check placement notices for details."},
            {"Fee Payment Reminder", "Your semester fee payment is due. Please clear your dues before the deadline."},
            {"Fee Payment Reminder", "Your Semester 3 fee payment is due. Please clear your dues before the deadline."},
            {"Library Book Due", "You have library books due for return. Please return them to avoid fines."}
    };

    private final Random random = new Random(42); // Fixed seed for reproducibility

    // 7 Authentic Faculty Members for CSE Department
    private static final String[][] FACULTY_DATA = {
            {"Prof S.R Karjol", "prof.srkarjol.cse@collego.edu", "Faculty@123", "Professor"},
            {"Dr. V.B Pagi", "dr.vbpagi.cse@collego.edu", "Faculty@123", "Associate Professor"},
            {"Dr. Vilas Naik", "dr.vilasnaik.cse@collego.edu", "Faculty@123", "Professor"},
            {"Dr. M.G Kambalimath", "dr.mgkambalimath.cse@collego.edu", "Faculty@123", "Associate Professor"},
            {"Prof Shama PS", "prof.shama.cse@collego.edu", "Faculty@123", "Assistant Professor"},
            {"Dr. S.V Saboji", "dr.svsaboji.cse@collego.edu", "Faculty@123", "Professor"},
            {"Dr. G.B Chittapur", "dr.gbchittapur.cse@collego.edu", "Faculty@123", "Associate Professor"}
    };

    // CSE Courses per semester (8 semesters, 4 years)
    private static final Map<Integer, String[][]> CSE_COURSES_BY_SEMESTER = new LinkedHashMap<>();
    static {
        // Semester 1
        CSE_COURSES_BY_SEMESTER.put(1, new String[][]{
                {"Engineering Mathematics I", "CSE101", "4"},
                {"Engineering Physics", "CSE102", "4"},
                {"Programming in C", "CSE103", "4"},
                {"Basic Electrical Engineering", "CSE104", "3"},
                {"Engineering Graphics", "CSE105", "3"},
                {"Communicative English", "CSE106", "2"}
        });
        // Semester 2
        CSE_COURSES_BY_SEMESTER.put(2, new String[][]{
                {"Engineering Mathematics II", "CSE201", "4"},
                {"Engineering Chemistry", "CSE202", "4"},
                {"Data Structures", "CSE203", "4"},
                {"Basic Electronics", "CSE204", "3"},
                {"Environmental Studies", "CSE205", "2"},
                {"Professional Communication", "CSE206", "2"}
        });
        // Semester 3
        CSE_COURSES_BY_SEMESTER.put(3, new String[][]{
                {"Engineering Mathematics III", "CSE301", "4"},
                {"Digital Logic Design", "CSE302", "4"},
                {"Object Oriented Programming", "CSE303", "4"},
                {"Computer Organization", "CSE304", "3"},
                {"Discrete Mathematics", "CSE305", "3"},
                {"Constitution of India", "CSE306", "2"}
        });
        // Semester 4
        CSE_COURSES_BY_SEMESTER.put(4, new String[][]{
                {"Engineering Mathematics IV", "CSE401", "4"},
                {"Database Management Systems", "CSE402", "4"},
                {"Operating Systems", "CSE403", "4"},
                {"Computer Networks", "CSE404", "3"},
                {"Software Engineering", "CSE405", "3"},
                {"Universal Human Values", "CSE406", "2"}
        });
        // Semester 5
        CSE_COURSES_BY_SEMESTER.put(5, new String[][]{
                {"Web Technologies", "CSE501", "4"},
                {"Machine Learning", "CSE502", "4"},
                {"Compiler Design", "CSE503", "4"},
                {"UI/UX Design", "CSE504", "3"},
                {"Cloud Computing", "CSE505", "3"},
                {"Professional Elective I", "CSE506", "3"}
        });
        // Semester 6
        CSE_COURSES_BY_SEMESTER.put(6, new String[][]{
                {"Artificial Intelligence", "CSE601", "4"},
                {"Data Analytics", "CSE602", "4"},
                {"Cyber Security", "CSE603", "4"},
                {"Mobile Application Development", "CSE604", "3"},
                {"Internet of Things", "CSE605", "3"},
                {"Professional Elective II", "CSE606", "3"}
        });
        // Semester 7
        CSE_COURSES_BY_SEMESTER.put(7, new String[][]{
                {"Prompt Engineering", "CSE701", "4"},
                {"Deep Learning", "CSE702", "4"},
                {"Big Data Analytics", "CSE703", "4"},
                {"DevOps", "CSE704", "3"},
                {"Blockchain Technology", "CSE705", "3"},
                {"Professional Elective III", "CSE706", "3"}
        });
        // Semester 8
        CSE_COURSES_BY_SEMESTER.put(8, new String[][]{
                {"Major Project", "CSE801", "8"},
                {"Internship", "CSE802", "6"},
                {"Seminar", "CSE803", "2"},
                {"Comprehensive Viva", "CSE804", "2"}
        });
    }

    // Student first names for variety
    private static final String[] STUDENT_FIRST_NAMES = {
            "Aarav", "Aditi", "Aditya", "Ananya", "Arjun", "Diya", "Ishaan", "Kavya",
            "Krishna", "Meera", "Neha", "Nikhil", "Pooja", "Priya", "Rahul", "Riya",
            "Rohan", "Saanvi", "Sanya", "Shreya", "Siddharth", "Tanvi", "Varun", "Vihaan",
            "Yash", "Akash", "Anjali", "Bhavya", "Chirag", "Divya", "Esha", "Farhan",
            "Gaurav", "Harsh", "Ira", "Jatin", "Kritika", "Laksh", "Maya", "Naman",
            "Omkar", "Pranav", "Rashmi", "Samir", "Tara", "Udit", "Ved", "Zara",
            "Aryan", "Dhruv", "Kiaan", "Mishka", "Nirvaan", "Prisha", "Reyansh", "Siya"
    };

    private static final String[] STUDENT_LAST_NAMES = {
            "Sharma", "Patel", "Reddy", "Kumar", "Singh", "Gupta", "Jain", "Verma",
            "Rao", "Nair", "Iyer", "Menon", "Pillai", "Das", "Chatterjee", "Bhat",
            "Hegde", "Shetty", "Kulkarni", "Deshpande", "Bansal", "Agarwal", "Malhotra",
            "Chopra", "Saxena", "Trivedi", "Shukla", "Mishra", "Dubey", "Tiwari"
    };

    @Override
    @Transactional
    public void run(String... args) {
        cleanupLegacySeededPlacementNotices();
        cleanupSeededNotifications();
        if (isSeedUpToDate()) {
            log.info("Academic seed data is up to date (7 faculty, 120 students, 8 semesters). Skipping seed.");
            return;
        }

        log.warn("Academic seed data is missing or outdated. Resetting all academic data and reseeding...");
        resetExistingAcademicData();
        // The JDBC truncate bypasses Hibernate, so detach every entity loaded by
        // the verification queries above before inserting the fresh dataset.
        entityManager.clear();

        log.info("=== Starting Academic Data Seeder for CSE Department ===");

        // 1. Create CSE Department only
        Department cseDept = seedCSEDepartment();

        // 2. Create all 8 semesters
        List<Semester> semesters = seedAllSemesters();

        // 3. Create courses for all semesters
        Map<Integer, List<Course>> coursesBySemester = seedAllCSECourses(cseDept);

        // 4. Create 7 authentic faculty members
        List<FacultyProfile> facultyList = seedAuthenticFaculty(cseDept);

        // 5. Create sections and assign faculty (faculty will self-assign later via portal)
        Map<String, List<Section>> semSections = seedSectionsForAllSemesters(coursesBySemester, semesters, facultyList);

        // 6. Create 30 students per year × 4 years = 120 students
        Map<Integer, List<StudentProfile>> studentsByYear = seedStudentsPerYear(cseDept);

        // 7. Enroll students in sections
        enrollStudentsInSections(studentsByYear, semSections, semesters);

        // 8. Create timetable for all semesters
        seedTimetableForAllSections(semSections);

        // 9. Create sample attendance, marks and notifications
        seedAcademicData(semSections, studentsByYear, semesters);

        log.info("=== Academic Data Seeder Complete ===");
        log.info("Created: 1 department (CSE), {} courses, 7 faculty, 120 students (30 per year × 4 years)",
                courseRepository.count());
        log.info("Sample student login: USN format 1CG24CS001 / Student@123");

        ensureAdminProfile();
    }

    private void cleanupLegacySeededPlacementNotices() {
        try {
            int removed = jdbcTemplate.update(LEGACY_SEEDED_PLACEMENTS_SQL);
            if (removed > 0) {
                log.info("Removed {} legacy seeded placement notice(s).", removed);
            }
        } catch (Exception e) {
            log.debug("Legacy placement cleanup skipped: {}", e.getMessage());
        }
    }

    private void cleanupSeededNotifications() {
        try {
            String sql = "DELETE FROM notifications WHERE " + String.join(" OR ",
                    Collections.nCopies(SEEDED_NOTIFICATIONS.length, "(title = ? AND message = ?)"));
            Object[] args = new Object[SEEDED_NOTIFICATIONS.length * 2];
            for (int i = 0; i < SEEDED_NOTIFICATIONS.length; i++) {
                args[i * 2] = SEEDED_NOTIFICATIONS[i][0];
                args[i * 2 + 1] = SEEDED_NOTIFICATIONS[i][1];
            }
            int removed = jdbcTemplate.update(sql, args);
            if (removed > 0) {
                log.info("Removed {} seeded notification(s).", removed);
            }
        } catch (Exception e) {
            log.debug("Seeded notification cleanup skipped: {}", e.getMessage());
        }
    }

    private void ensureAdminProfile() {
        String admin = (adminEmail != null && !adminEmail.isBlank())
                ? adminEmail.trim().toLowerCase()
                : "admin@collego.edu";
        userRepository.findByEmailIgnoreCase(admin).ifPresent(user -> {
            if (adminProfileRepository.findByUserId(user.getId()).isEmpty()) {
                adminProfileRepository.save(AdminProfile.builder()
                        .user(user)
                        .adminLevel("SUPER_ADMIN")
                        .build());
                log.info("Admin profile recreated for {}", admin);
            }
        });
    }

    // ==================== Seeder Helpers ====================

    /**
     * Returns true only when the database already holds exactly the dataset this
     * seeder is responsible for. Any legacy/partial seed therefore triggers a
     * clean reseed instead of being silently skipped.
     */
    private boolean isSeedUpToDate() {
        try {
            if (departmentRepository.findByCode("CSE").isEmpty()) return false;
            if (semesterRepository.count() != EXPECTED_SEMESTER_COUNT) return false;
            if (courseRepository.count() < expectedCourseCount()) return false;
            if (studentProfileRepository.count() < EXPECTED_STUDENT_COUNT) return false;
            for (String[] faculty : FACULTY_DATA) {
                if (userRepository.findByEmailIgnoreCase(faculty[1]).isEmpty()) return false;
            }
            return true;
        } catch (Exception e) {
            log.warn("Could not verify existing seed data ({}). A reseed will be attempted.", e.getMessage());
            return false;
        }
    }

    private int expectedCourseCount() {
        return CSE_COURSES_BY_SEMESTER.values().stream().mapToInt(courses -> courses.length).sum();
    }

    /**
     * Wipes every academic table (and all non-admin accounts) so the seeder can
     * rebuild the dataset from scratch. The bootstrap admin account is preserved.
     */
    private void resetExistingAcademicData() {
        String product = "";
        try (Connection connection = Objects.requireNonNull(jdbcTemplate.getDataSource()).getConnection()) {
            product = connection.getMetaData().getDatabaseProductName();
        } catch (Exception e) {
            log.warn("Unable to detect database vendor: {}", e.getMessage());
        }

        if (product != null && product.toLowerCase().contains("postgres")) {
            List<String> tables = jdbcTemplate.queryForList(
                    "SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> 'users'",
                    String.class);
            if (!tables.isEmpty()) {
                String joined = tables.stream()
                        .map(table -> "\"" + table + "\"")
                        .collect(Collectors.joining(", "));
                jdbcTemplate.execute("TRUNCATE TABLE " + joined + " RESTART IDENTITY CASCADE");
                log.info("Truncated {} academic table(s).", tables.size());
            }
        } else {
            log.warn("Database vendor '{}' is not PostgreSQL — skipping table truncate.", product);
        }

        String admin = (adminEmail != null && !adminEmail.isBlank())
                ? adminEmail.trim().toLowerCase()
                : "admin@collego.edu";
        int removed = jdbcTemplate.update("DELETE FROM users WHERE LOWER(email) <> ?", admin);
        log.info("Removed {} previously seeded account(s); kept admin '{}'.", removed, admin);
    }


    private Department seedCSEDepartment() {
        Department existing = departmentRepository.findByCode("CSE").orElse(null);
        if (existing != null) return existing;

        Department department = Department.builder()
                .name("Computer Science & Engineering")
                .code("CSE")
                .description("Computer Science & Engineering Department")
                .build();
        return departmentRepository.save(department);
    }

    private List<Semester> seedAllSemesters() {
        List<Semester> semesters = new ArrayList<>();
        String academicYear = "2025-2026";

        for (int i = 1; i <= 8; i++) {
            boolean isActive = (i == 7 || i == 8); // Current active semesters
            LocalDate start, end;

            if (i % 2 == 1) { // Odd semesters (Jul-Dec)
                start = LocalDate.of(2025, 8, 1);
                end = LocalDate.of(2025, 12, 31);
            } else { // Even semesters (Jan-Jun)
                start = LocalDate.of(2026, 1, 15);
                end = LocalDate.of(2026, 6, 30);
            }

            Semester sem = Semester.builder()
                    .name("Semester " + i)
                    .number(i)
                    .academicYear(academicYear)
                    .startDate(start)
                    .endDate(end)
                    .isActive(isActive)
                    .build();
            semesters.add(semesterRepository.save(sem));
        }
        return semesters;
    }

    private Map<Integer, List<Course>> seedAllCSECourses(Department cseDept) {
        Map<Integer, List<Course>> coursesBySemester = new LinkedHashMap<>();

        for (Map.Entry<Integer, String[][]> entry : CSE_COURSES_BY_SEMESTER.entrySet()) {
            int semNum = entry.getKey();
            String[][] coursesData = entry.getValue();
            List<Course> courseList = new ArrayList<>();

            for (String[] courseData : coursesData) {
                Course course = Course.builder()
                        .name(courseData[0])
                        .code(courseData[1])
                        .credits(Integer.parseInt(courseData[2]))
                        .department(cseDept)
                        .description(courseData[0] + " for CSE Semester " + semNum)
                        .build();
                courseList.add(courseRepository.save(course));
            }
            coursesBySemester.put(semNum, courseList);
        }
        return coursesBySemester;
    }

    private List<FacultyProfile> seedAuthenticFaculty(Department cseDept) {
        List<FacultyProfile> facultyList = new ArrayList<>();

        for (int i = 0; i < FACULTY_DATA.length; i++) {
            String[] f = FACULTY_DATA[i];
            String name = f[0];
            String email = f[1];
            String password = f[2];
            String designation = f[3];

            String[] nameParts = name.split(" ", 2);
            String firstName = nameParts[0];
            String lastName = nameParts.length > 1 ? nameParts[1] : "";

            User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (user == null) {
                user = User.builder()
                        .email(email)
                        .passwordHash(passwordEncoder.encode(password))
                        .firstName(firstName)
                        .lastName(lastName)
                        .role(Role.FACULTY)
                        .isActive(true)
                        .build();
                user = userRepository.save(user);
                log.info("Created faculty user: {} / {}", email, password);
            }

            FacultyProfile faculty = FacultyProfile.builder()
                    .user(user)
                    .department(cseDept)
                    .employeeId("FAC-CSE-" + String.format("%03d", i + 1))
                    .designation(designation)
                    .build();
            facultyList.add(facultyProfileRepository.save(faculty));
        }
        return facultyList;
    }

    private Map<String, List<Section>> seedSectionsForAllSemesters(
            Map<Integer, List<Course>> coursesBySemester,
            List<Semester> semesters,
            List<FacultyProfile> facultyList) {

        Map<String, List<Section>> semSections = new HashMap<>();

        for (Semester semester : semesters) {
            int semNum = semester.getNumber();
            List<Course> courses = coursesBySemester.get(semNum);
            if (courses == null) continue;

            List<Section> sections = new ArrayList<>();
            for (int i = 0; i < courses.size(); i++) {
                Course course = courses.get(i);
                // Create Section A and B for each course
                for (String secName : new String[]{"A", "B"}) {
                    Section section = Section.builder()
                            .name(secName)
                            .course(course)
                            .semester(semester)
                            .faculty(null) // Faculty will self-assign via portal
                            .maxCapacity(60)
                            .build();
                    sections.add(sectionRepository.save(section));
                }
            }
            semSections.put(semester.getId().toString(), sections);
        }
        return semSections;
    }

    private Map<Integer, List<StudentProfile>> seedStudentsPerYear(Department cseDept) {
        Map<Integer, List<StudentProfile>> studentsByYear = new HashMap<>();
        int globalIndex = 0;

        for (int year = 1; year <= 4; year++) {
            List<StudentProfile> yearStudents = new ArrayList<>();
            for (int i = 0; i < 30; i++) {
                String firstName = STUDENT_FIRST_NAMES[(globalIndex + i) % STUDENT_FIRST_NAMES.length];
                String lastName = STUDENT_LAST_NAMES[(globalIndex + i) % STUDENT_LAST_NAMES.length];
                // USN format: 1CG + 24 (admission year) + CS + 3-digit number
                String usn = String.format("1CG24CS%03d", globalIndex + i + 1);
                String email = "student" + (globalIndex + i + 1) + ".cse@collego.edu";

                User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
                if (user == null) {
                    user = User.builder()
                            .email(email)
                            .passwordHash(passwordEncoder.encode("Student@123"))
                            .firstName(firstName)
                            .lastName(lastName)
                            .role(Role.STUDENT)
                            .isActive(true)
                            .build();
                    user = userRepository.save(user);
                }

                // Students in year 1: sem 1-2, year 2: sem 3-4, year 3: sem 5-6, year 4: sem 7-8
                int currentSemester = (year - 1) * 2 + 1; // Current odd semester
                String section = (i < 15) ? "A" : "B";

                StudentProfile student = StudentProfile.builder()
                        .user(user)
                        .department(cseDept)
                        .enrollmentNumber(usn) // USN stored as enrollmentNumber
                        .semester(currentSemester)
                        .section(section)
                        .admissionYear(2024)
                        .build();
                yearStudents.add(studentProfileRepository.save(student));
            }
            studentsByYear.put(year, yearStudents);
            globalIndex += 30;
        }
        return studentsByYear;
    }

    private void enrollStudentsInSections(
            Map<Integer, List<StudentProfile>> studentsByYear,
            Map<String, List<Section>> semSections,
            List<Semester> semesters) {

        for (int year = 1; year <= 4; year++) {
            List<StudentProfile> yearStudents = studentsByYear.get(year);
            List<StudentProfile> sectionAStudents = new ArrayList<>();
            List<StudentProfile> sectionBStudents = new ArrayList<>();

            for (StudentProfile s : yearStudents) {
                if (s.getSection().equals("A")) sectionAStudents.add(s);
                else sectionBStudents.add(s);
            }

            // Year 1 -> Sem 1,2; Year 2 -> Sem 3,4; Year 3 -> Sem 5,6; Year 4 -> Sem 7,8
            int sem1Index = (year - 1) * 2;
            int sem2Index = sem1Index + 1;

            if (sem1Index < semesters.size()) {
                enrollStudentsInSemesterSections(semSections, semesters.get(sem1Index), sectionAStudents, sectionBStudents, EnrollmentStatus.ACTIVE);
            }
            if (sem2Index < semesters.size()) {
                enrollStudentsInSemesterSections(semSections, semesters.get(sem2Index), sectionAStudents, sectionBStudents, EnrollmentStatus.ACTIVE);
            }
        }
    }

    private void enrollStudentsInSemesterSections(
            Map<String, List<Section>> semSections,
            Semester semester,
            List<StudentProfile> sectionAStudents,
            List<StudentProfile> sectionBStudents,
            EnrollmentStatus status) {

        List<Section> sections = semSections.get(semester.getId().toString());
        if (sections == null) return;

        for (Section section : sections) {
            List<StudentProfile> studentsForSection = section.getName().equals("A") ? sectionAStudents : sectionBStudents;
            for (StudentProfile student : studentsForSection) {
                Enrollment enrollment = Enrollment.builder()
                        .student(student)
                        .section(section)
                        .status(status)
                        .build();
                enrollmentRepository.save(enrollment);
            }
        }
    }

    private void seedTimetableForAllSections(Map<String, List<Section>> semSections) {
        LocalTime[] startTimes = {
                LocalTime.of(9, 0), LocalTime.of(10, 0), LocalTime.of(11, 0),
                LocalTime.of(12, 0), LocalTime.of(14, 0), LocalTime.of(15, 0)
        };
        LocalTime[] endTimes = {
                LocalTime.of(9, 50), LocalTime.of(10, 50), LocalTime.of(11, 50),
                LocalTime.of(12, 50), LocalTime.of(14, 50), LocalTime.of(15, 50)
        };

        for (List<Section> sections : semSections.values()) {
            Map<String, List<Section>> sectionsByName = new HashMap<>();
            for (Section section : sections) {
                sectionsByName.computeIfAbsent(section.getName(), k -> new ArrayList<>()).add(section);
            }

            for (Map.Entry<String, List<Section>> entry : sectionsByName.entrySet()) {
                List<Section> secs = entry.getValue();
                int roomBase = entry.getKey().equals("A") ? 100 : 200;

                for (DayOfWeekEnum day : DayOfWeekEnum.values()) {
                    List<Section> shuffled = new ArrayList<>(secs);
                    Collections.shuffle(shuffled, random);
                    for (int i = 0; i < Math.min(shuffled.size(), startTimes.length); i++) {
                        TimetableSlot slot = TimetableSlot.builder()
                                .section(shuffled.get(i))
                                .dayOfWeek(day)
                                .startTime(startTimes[i])
                                .endTime(endTimes[i])
                                .roomNumber("Room " + (roomBase + i + 1))
                                .build();
                        timetableSlotRepository.save(slot);
                    }
                }
            }
        }
    }

    private void seedAcademicData(
            Map<String, List<Section>> semSections,
            Map<Integer, List<StudentProfile>> studentsByYear,
            List<Semester> semesters) {

        // Collect all students
        List<StudentProfile> allStudents = new ArrayList<>();
        for (List<StudentProfile> list : studentsByYear.values()) {
            allStudents.addAll(list);
        }

        // For current active semesters (7, 8), create attendance and internal marks
        for (Semester semester : semesters) {
            if (!semester.isActive()) continue;

            List<Section> sections = semSections.get(semester.getId().toString());
            if (sections == null) continue;

            // Split students by section for this semester
            List<StudentProfile> sectionAStudents = new ArrayList<>();
            List<StudentProfile> sectionBStudents = new ArrayList<>();
            for (StudentProfile s : allStudents) {
                if (s.getSemester() == semester.getNumber()) {
                    if (s.getSection().equals("A")) sectionAStudents.add(s);
                    else sectionBStudents.add(s);
                }
            }

            seedAttendance(sections, sectionAStudents, sectionBStudents);
            seedInternalMarks(sections, sectionAStudents, sectionBStudents);
        }

        // For completed semesters, create semester marks
        for (Semester semester : semesters) {
            if (semester.isActive()) continue;

            List<Section> sections = semSections.get(semester.getId().toString());
            if (sections == null) continue;

            List<StudentProfile> sectionAStudents = new ArrayList<>();
            List<StudentProfile> sectionBStudents = new ArrayList<>();
            for (StudentProfile s : allStudents) {
                if (s.getSemester() <= semester.getNumber()) {
                    if (s.getSection().equals("A")) sectionAStudents.add(s);
                    else sectionBStudents.add(s);
                }
            }

            seedSemesterMarks(sections, sectionAStudents, sectionBStudents);
        }

    }

    private void seedAttendance(List<Section> sections, List<StudentProfile> sectionA, List<StudentProfile> sectionB) {
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(30);

        for (Section section : sections) {
            List<StudentProfile> students = section.getName().equals("A") ? sectionA : sectionB;

            LocalDate date = startDate;
            while (!date.isAfter(today)) {
                if (date.getDayOfWeek().getValue() <= 6 && date.getDayOfWeek().getValue() >= 1) {
                    for (StudentProfile student : students) {
                        AttendanceStatus status = random.nextDouble() < 0.80
                                ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;

                        Attendance att = Attendance.builder()
                                .student(student)
                                .section(section)
                                .date(date)
                                .status(status)
                                .build();
                        attendanceRepository.save(att);
                    }
                }
                date = date.plusDays(1);
            }
        }
    }

    private void seedInternalMarks(List<Section> sections, List<StudentProfile> sectionA, List<StudentProfile> sectionB) {
        for (Section section : sections) {
            List<StudentProfile> students = section.getName().equals("A") ? sectionA : sectionB;

            for (StudentProfile student : students) {
                // IA-1
                double ia1Marks = 20 + random.nextDouble() * 30;
                InternalMarks ia1 = InternalMarks.builder()
                        .student(student)
                        .section(section)
                        .examName("IA-1")
                        .maxMarks(50.0)
                        .obtainedMarks(Math.round(ia1Marks * 10.0) / 10.0)
                        .build();
                internalMarksRepository.save(ia1);

                // IA-2
                double ia2Marks = 20 + random.nextDouble() * 30;
                InternalMarks ia2 = InternalMarks.builder()
                        .student(student)
                        .section(section)
                        .examName("IA-2")
                        .maxMarks(50.0)
                        .obtainedMarks(Math.round(ia2Marks * 10.0) / 10.0)
                        .build();
                internalMarksRepository.save(ia2);
            }
        }
    }

    private void seedSemesterMarks(List<Section> sections, List<StudentProfile> sectionA, List<StudentProfile> sectionB) {
        for (Section section : sections) {
            List<StudentProfile> students = section.getName().equals("A") ? sectionA : sectionB;

            for (StudentProfile student : students) {
                double obtainedMarks = 35 + random.nextDouble() * 65;
                obtainedMarks = Math.round(obtainedMarks * 10.0) / 10.0;
                double percentage = obtainedMarks;
                String grade = Grade.calculateGrade(percentage);
                double gradePoints = Grade.calculateGradePoints(percentage);

                SemesterMarks marks = SemesterMarks.builder()
                        .student(student)
                        .section(section)
                        .maxMarks(100.0)
                        .obtainedMarks(obtainedMarks)
                        .grade(grade)
                        .gradePoints(gradePoints)
                        .build();
                semesterMarksRepository.save(marks);
            }
        }
    }
}