package com.collego.config;

import com.collego.entity.*;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(2) // Run after DataSeeder (which creates bootstrap admin)
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
    private final FeeRepository feeRepository;
    private final FeeItemRepository feeItemRepository;
    private final PlacementNoticeRepository placementNoticeRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    private final Random random = new Random(42); // Fixed seed for reproducibility

    // Department definitions: name -> code
    private static final String[][] DEPARTMENTS = {
            {"AI & ML", "AIML"},
            {"Automobile Engineering", "AU"},
            {"Biotechnology", "BT"},
            {"Civil Engineering", "CE"},
            {"Computer Science & Engineering", "CSE"},
            {"Electrical & Electronics Engineering", "EEE"},
            {"Electronics & Communication Engineering", "ECE"},
            {"Electronics & Computer Engineering", "EC"},
            {"Industrial & Production Engineering", "IPE"},
            {"Information Science & Engineering", "ISE"},
            {"Mechanical Engineering", "ME"}
    };

    // Course names per department (generic — 6 courses each)
    private static final Map<String, String[][]> DEPARTMENT_COURSES = new LinkedHashMap<>();
    static {
        DEPARTMENT_COURSES.put("AIML", new String[][]{
                {"Machine Learning", "AIML301", "4"}, {"Deep Learning", "AIML302", "4"},
                {"Natural Language Processing", "AIML303", "3"}, {"Computer Vision", "AIML304", "3"},
                {"Data Structures & Algorithms", "AIML305", "4"}, {"Mathematics for AI", "AIML306", "3"}
        });
        DEPARTMENT_COURSES.put("AU", new String[][]{
                {"Automotive Engineering", "AU301", "4"}, {"Vehicle Dynamics", "AU302", "3"},
                {"IC Engines", "AU303", "4"}, {"Automotive Electrical Systems", "AU304", "3"},
                {"CAD/CAM", "AU305", "3"}, {"Engineering Mathematics III", "AU306", "4"}
        });
        DEPARTMENT_COURSES.put("BT", new String[][]{
                {"Molecular Biology", "BT301", "4"}, {"Genetic Engineering", "BT302", "4"},
                {"Biochemistry", "BT303", "3"}, {"Microbiology", "BT304", "3"},
                {"Bioprocess Engineering", "BT305", "4"}, {"Biostatistics", "BT306", "3"}
        });
        DEPARTMENT_COURSES.put("CE", new String[][]{
                {"Structural Analysis", "CE301", "4"}, {"Geotechnical Engineering", "CE302", "4"},
                {"Fluid Mechanics", "CE303", "3"}, {"Surveying", "CE304", "3"},
                {"Building Materials", "CE305", "3"}, {"Engineering Mathematics III", "CE306", "4"}
        });
        DEPARTMENT_COURSES.put("CSE", new String[][]{
                {"Data Structures & Algorithms", "CSE301", "4"}, {"Database Management Systems", "CSE302", "4"},
                {"Operating Systems", "CSE303", "4"}, {"Computer Networks", "CSE304", "3"},
                {"Software Engineering", "CSE305", "3"}, {"Discrete Mathematics", "CSE306", "3"}
        });
        DEPARTMENT_COURSES.put("EEE", new String[][]{
                {"Power Systems", "EEE301", "4"}, {"Electrical Machines", "EEE302", "4"},
                {"Control Systems", "EEE303", "3"}, {"Digital Electronics", "EEE304", "3"},
                {"Power Electronics", "EEE305", "4"}, {"Engineering Mathematics III", "EEE306", "3"}
        });
        DEPARTMENT_COURSES.put("ECE", new String[][]{
                {"Analog Electronics", "ECE301", "4"}, {"Digital Signal Processing", "ECE302", "4"},
                {"Communication Systems", "ECE303", "3"}, {"Microprocessors", "ECE304", "3"},
                {"VLSI Design", "ECE305", "4"}, {"Electromagnetic Theory", "ECE306", "3"}
        });
        DEPARTMENT_COURSES.put("EC", new String[][]{
                {"Embedded Systems", "EC301", "4"}, {"Computer Architecture", "EC302", "4"},
                {"Digital Communication", "EC303", "3"}, {"Microcontrollers", "EC304", "3"},
                {"IoT Systems", "EC305", "3"}, {"Signals & Systems", "EC306", "4"}
        });
        DEPARTMENT_COURSES.put("IPE", new String[][]{
                {"Operations Research", "IPE301", "4"}, {"Production Technology", "IPE302", "4"},
                {"Quality Engineering", "IPE303", "3"}, {"Industrial Management", "IPE304", "3"},
                {"Supply Chain Management", "IPE305", "3"}, {"Engineering Economics", "IPE306", "3"}
        });
        DEPARTMENT_COURSES.put("ISE", new String[][]{
                {"Data Structures & Algorithms", "ISE301", "4"}, {"Web Technologies", "ISE302", "3"},
                {"Cloud Computing", "ISE303", "3"}, {"Information Security", "ISE304", "4"},
                {"Software Testing", "ISE305", "3"}, {"Discrete Mathematics", "ISE306", "3"}
        });
        DEPARTMENT_COURSES.put("ME", new String[][]{
                {"Thermodynamics", "ME301", "4"}, {"Fluid Mechanics", "ME302", "4"},
                {"Manufacturing Processes", "ME303", "3"}, {"Machine Design", "ME304", "4"},
                {"Heat Transfer", "ME305", "3"}, {"Engineering Mathematics III", "ME306", "3"}
        });
    }

    private static final String[] FIRST_NAMES = {
            "Aarav", "Aditi", "Aditya", "Ananya", "Arjun", "Diya", "Ishaan", "Kavya",
            "Krishna", "Meera", "Neha", "Nikhil", "Pooja", "Priya", "Rahul", "Riya",
            "Rohan", "Saanvi", "Sanya", "Shreya", "Siddharth", "Tanvi", "Varun", "Vihaan",
            "Yash", "Akash", "Anjali", "Bhavya", "Chirag", "Divya"
    };

    private static final String[] LAST_NAMES = {
            "Sharma", "Patel", "Reddy", "Kumar", "Singh", "Gupta", "Jain", "Verma",
            "Rao", "Nair", "Iyer", "Menon", "Pillai", "Das", "Chatterjee", "Bhat",
            "Hegde", "Shetty", "Kulkarni", "Deshpande"
    };

    private static final String[] FACULTY_PREFIXES = {"Dr. ", "Prof. ", ""};

    @Override
    @Transactional
    public void run(String... args) {
        if (departmentRepository.count() > 0) {
            log.info("Academic data already exists. Skipping seed.");
            return;
        }

        log.info("=== Starting Academic Data Seeder ===");

        // 1. Create departments
        Map<String, Department> departments = seedDepartments();

        // 2. Create semesters
        Semester sem2 = seedSemester("Semester 2", 2, "2025-2026",
                LocalDate.of(2025, 8, 1), LocalDate.of(2025, 12, 31), false);
        Semester sem3 = seedSemester("Semester 3", 3, "2025-2026",
                LocalDate.of(2026, 1, 15), LocalDate.of(2026, 6, 30), true);

        // 3. Create courses, faculty, students, sections, enrollments, data for each department
        int totalStudents = 0;
        int totalFaculty = 0;

        for (String[] dept : DEPARTMENTS) {
            String deptCode = dept[1];
            Department department = departments.get(deptCode);
            String[][] courses = DEPARTMENT_COURSES.get(deptCode);

            // Create courses
            List<Course> courseList = new ArrayList<>();
            for (String[] courseData : courses) {
                Course course = Course.builder()
                        .name(courseData[0])
                        .code(courseData[1])
                        .credits(Integer.parseInt(courseData[2]))
                        .department(department)
                        .description(courseData[0] + " for " + dept[0])
                        .build();
                courseList.add(courseRepository.save(course));
            }

            // Create faculty (1 per course = 6 faculty per dept)
            List<FacultyProfile> facultyList = new ArrayList<>();
            for (int i = 0; i < courseList.size(); i++) {
                FacultyProfile faculty = createFaculty(department, deptCode, i + 1);
                facultyList.add(faculty);
                totalFaculty++;
            }

            // Create sections (A & B for each course for each semester)
            Map<String, List<Section>> semSections = new HashMap<>();

            for (Semester semester : List.of(sem2, sem3)) {
                List<Section> sections = new ArrayList<>();
                for (int i = 0; i < courseList.size(); i++) {
                    Course course = courseList.get(i);
                    FacultyProfile faculty = facultyList.get(i);

                    for (String secName : new String[]{"A", "B"}) {
                        Section section = Section.builder()
                                .name(secName)
                                .course(course)
                                .semester(semester)
                                .faculty(faculty)
                                .maxCapacity(60)
                                .build();
                        sections.add(sectionRepository.save(section));
                    }
                }
                semSections.put(semester.getId().toString(), sections);
            }

            // Create students (15 per section = 30 per dept)
            List<StudentProfile> sectionAStudents = new ArrayList<>();
            List<StudentProfile> sectionBStudents = new ArrayList<>();

            for (int i = 0; i < 30; i++) {
                String sectionName = i < 15 ? "A" : "B";
                StudentProfile student = createStudent(department, deptCode, totalStudents + i + 1, sectionName);
                if (sectionName.equals("A")) {
                    sectionAStudents.add(student);
                } else {
                    sectionBStudents.add(student);
                }
            }
            totalStudents += 30;

            // Enroll students in sections
            for (Semester semester : List.of(sem2, sem3)) {
                List<Section> sections = semSections.get(semester.getId().toString());
                EnrollmentStatus status = semester.isActive() ? EnrollmentStatus.ACTIVE : EnrollmentStatus.COMPLETED;

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

            // Create timetable for current semester (sem3) sections
            List<Section> currentSections = semSections.get(sem3.getId().toString());
            seedTimetable(currentSections);

            // Create attendance for current semester sections
            seedAttendance(currentSections, sectionAStudents, sectionBStudents);

            // Create internal marks for current semester
            seedInternalMarks(currentSections, sectionAStudents, sectionBStudents);

            // Create semester marks for previous semester (sem2)
            List<Section> prevSections = semSections.get(sem2.getId().toString());
            seedSemesterMarks(prevSections, sectionAStudents, sectionBStudents);

            // Create fees
            seedFees(sectionAStudents, sectionBStudents, sem2, sem3);

            // Create notifications
            seedNotifications(sectionAStudents, sectionBStudents);

            log.info("Seeded department: {} — {} courses, {} faculty, 30 students",
                    dept[0], courseList.size(), facultyList.size());
        }

        // Seed placement notices (global)
        seedPlacementNotices(departments);

        log.info("=== Academic Data Seeder Complete ===");
        log.info("Total: {} departments, {} courses, {} faculty, {} students",
                DEPARTMENTS.length, courseRepository.count(), totalFaculty, totalStudents);
        log.info("Sample student login: student1.cse@collego.edu / Student@123");
    }

    // ==================== Seeder Helpers ====================

    private Map<String, Department> seedDepartments() {
        Map<String, Department> map = new LinkedHashMap<>();
        for (String[] dept : DEPARTMENTS) {
            Department existing = departmentRepository.findByCode(dept[1]).orElse(null);
            if (existing != null) {
                map.put(dept[1], existing);
            } else {
                Department department = Department.builder()
                        .name(dept[0])
                        .code(dept[1])
                        .description(dept[0] + " Department")
                        .build();
                map.put(dept[1], departmentRepository.save(department));
            }
        }
        return map;
    }

    private Semester seedSemester(String name, int number, String academicYear, LocalDate start, LocalDate end, boolean active) {
        return semesterRepository.findByNumberAndAcademicYear(number, academicYear)
                .orElseGet(() -> {
                    Semester sem = Semester.builder()
                            .name(name)
                            .number(number)
                            .academicYear(academicYear)
                            .startDate(start)
                            .endDate(end)
                            .isActive(active)
                            .build();
                    return semesterRepository.save(sem);
                });
    }

    private FacultyProfile createFaculty(Department department, String deptCode, int index) {
        String prefix = FACULTY_PREFIXES[random.nextInt(FACULTY_PREFIXES.length)];
        String firstName = prefix + FIRST_NAMES[random.nextInt(FIRST_NAMES.length)];
        String lastName = LAST_NAMES[random.nextInt(LAST_NAMES.length)];
        String email = "faculty" + index + "." + deptCode.toLowerCase() + "@collego.edu";

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode("Faculty@123"))
                .firstName(firstName)
                .lastName(lastName)
                .role(Role.FACULTY)
                .isActive(true)
                .build();
        user = userRepository.save(user);

        FacultyProfile faculty = FacultyProfile.builder()
                .user(user)
                .department(department)
                .employeeId("FAC-" + deptCode + "-" + String.format("%03d", index))
                .designation(random.nextBoolean() ? "Assistant Professor" : "Associate Professor")
                .build();
        return facultyProfileRepository.save(faculty);
    }

    private StudentProfile createStudent(Department department, String deptCode, int globalIndex, String section) {
        int localIndex = ((globalIndex - 1) % 30) + 1;
        String firstName = FIRST_NAMES[globalIndex % FIRST_NAMES.length];
        String lastName = LAST_NAMES[globalIndex % LAST_NAMES.length];
        String email = "student" + localIndex + "." + deptCode.toLowerCase() + "@collego.edu";

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode("Student@123"))
                .firstName(firstName)
                .lastName(lastName)
                .role(Role.STUDENT)
                .isActive(true)
                .build();
        user = userRepository.save(user);

        StudentProfile student = StudentProfile.builder()
                .user(user)
                .department(department)
                .enrollmentNumber("1CG" + deptCode + String.format("%03d", globalIndex))
                .semester(3) // Current semester
                .section(section)
                .admissionYear(2024)
                .build();
        return studentProfileRepository.save(student);
    }

    private void seedTimetable(List<Section> sections) {
        LocalTime[] startTimes = {
                LocalTime.of(9, 0), LocalTime.of(10, 0), LocalTime.of(11, 0),
                LocalTime.of(12, 0), LocalTime.of(14, 0), LocalTime.of(15, 0)
        };
        LocalTime[] endTimes = {
                LocalTime.of(9, 50), LocalTime.of(10, 50), LocalTime.of(11, 50),
                LocalTime.of(12, 50), LocalTime.of(14, 50), LocalTime.of(15, 50)
        };

        // Group sections by section name (A or B) — each section name group gets its own timetable
        Map<String, List<Section>> sectionsByName = new HashMap<>();
        for (Section section : sections) {
            sectionsByName.computeIfAbsent(section.getName(), k -> new ArrayList<>()).add(section);
        }

        for (Map.Entry<String, List<Section>> entry : sectionsByName.entrySet()) {
            List<Section> secs = entry.getValue();
            int roomBase = entry.getKey().equals("A") ? 100 : 200;

            for (DayOfWeekEnum day : DayOfWeekEnum.values()) {
                // Assign 6 periods per day — one per course (shuffled)
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

    private void seedAttendance(List<Section> sections, List<StudentProfile> sectionA, List<StudentProfile> sectionB) {
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(30);

        for (Section section : sections) {
            List<StudentProfile> students = section.getName().equals("A") ? sectionA : sectionB;

            // Generate attendance for working days in last 30 days
            LocalDate date = startDate;
            while (!date.isAfter(today)) {
                if (date.getDayOfWeek().getValue() <= 6 && date.getDayOfWeek().getValue() >= 1) { // MON-SAT
                    for (StudentProfile student : students) {
                        // ~80% attendance rate
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
                double ia1Marks = 20 + random.nextDouble() * 30; // 20-50 out of 50
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
                double obtainedMarks = 35 + random.nextDouble() * 65; // 35-100 out of 100
                obtainedMarks = Math.round(obtainedMarks * 10.0) / 10.0;
                double percentage = obtainedMarks; // max is 100
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

    private void seedFees(List<StudentProfile> sectionA, List<StudentProfile> sectionB,
                          Semester sem2, Semester sem3) {
        List<StudentProfile> allStudents = new ArrayList<>();
        allStudents.addAll(sectionA);
        allStudents.addAll(sectionB);

        for (StudentProfile student : allStudents) {
            // Fee for previous semester (paid)
            createFee(student, sem2, FeeStatus.PAID);
            // Fee for current semester (mix of paid and pending)
            FeeStatus currentStatus = random.nextDouble() < 0.7 ? FeeStatus.PAID : FeeStatus.PENDING;
            createFee(student, sem3, currentStatus);
        }
    }

    private void createFee(StudentProfile student, Semester semester, FeeStatus status) {
        BigDecimal tuition = BigDecimal.valueOf(50000);
        BigDecimal labFee = BigDecimal.valueOf(5000);
        BigDecimal hostelFee = BigDecimal.valueOf(30000);
        BigDecimal libraryFee = BigDecimal.valueOf(2000);
        BigDecimal examFee = BigDecimal.valueOf(3000);
        BigDecimal totalAmount = tuition.add(labFee).add(hostelFee).add(libraryFee).add(examFee);

        Fee fee = Fee.builder()
                .student(student)
                .semester(semester)
                .totalAmount(totalAmount)
                .paidAmount(status == FeeStatus.PAID ? totalAmount : BigDecimal.ZERO)
                .dueDate(semester.getStartDate() != null ? semester.getStartDate().plusDays(30) : LocalDate.now().plusDays(30))
                .status(status)
                .paidAt(status == FeeStatus.PAID ? semester.getStartDate() != null ? semester.getStartDate().plusDays(10).atTime(10, 0) : null : null)
                .transactionRef(status == FeeStatus.PAID ? "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase() : null)
                .build();
        fee = feeRepository.save(fee);

        // Add line items
        List<FeeItem> items = List.of(
                FeeItem.builder().fee(fee).category(FeeCategory.ACADEMIC).description("Tuition Fee").amount(tuition).build(),
                FeeItem.builder().fee(fee).category(FeeCategory.ACADEMIC).description("Laboratory Fee").amount(labFee).build(),
                FeeItem.builder().fee(fee).category(FeeCategory.HOSTEL).description("Hostel Charges").amount(hostelFee).build(),
                FeeItem.builder().fee(fee).category(FeeCategory.MISCELLANEOUS).description("Library Fee").amount(libraryFee).build(),
                FeeItem.builder().fee(fee).category(FeeCategory.MISCELLANEOUS).description("Examination Fee").amount(examFee).build()
        );
        feeItemRepository.saveAll(items);
    }

    private void seedPlacementNotices(Map<String, Department> departments) {
        User admin = userRepository.findByEmail("admin@collego.edu").orElse(null);

        // Global notices (all departments)
        createPlacementNotice("Software Engineer — Google", "Google", null, admin,
                "Google is hiring for the role of Software Engineer (L3). Open to all engineering branches.",
                "CGPA >= 7.0, No active backlogs", "₹25-40 LPA", LocalDate.now().plusDays(15));

        createPlacementNotice("Analyst — Goldman Sachs", "Goldman Sachs", null, admin,
                "Goldman Sachs is looking for bright analysts for their Bangalore office.",
                "CGPA >= 7.5, Strong analytical skills", "₹18-25 LPA", LocalDate.now().plusDays(20));

        createPlacementNotice("SDE Intern — Amazon", "Amazon", null, admin,
                "Amazon Summer Internship 2026. 6-month internship with PPO opportunity.",
                "CGPA >= 6.5, Proficiency in DSA", "₹60,000/month + benefits", LocalDate.now().plusDays(10));

        // Department-specific notices
        createPlacementNotice("ML Engineer — Microsoft", "Microsoft",
                departments.get("AIML"), admin,
                "Microsoft AI division is hiring ML Engineers.",
                "CGPA >= 8.0, Experience with ML frameworks", "₹30-45 LPA", LocalDate.now().plusDays(25));

        createPlacementNotice("Network Engineer — Cisco", "Cisco",
                departments.get("CSE"), admin,
                "Cisco is hiring network engineers for their R&D center.",
                "CGPA >= 7.0, Networking fundamentals", "₹15-20 LPA", LocalDate.now().plusDays(18));

        createPlacementNotice("Design Engineer — Tata Motors", "Tata Motors",
                departments.get("ME"), admin,
                "Tata Motors is hiring mechanical design engineers.",
                "CGPA >= 6.5, CAD/CAM skills preferred", "₹8-12 LPA", LocalDate.now().plusDays(12));

        log.info("Seeded {} placement notices", 6);
    }

    private void createPlacementNotice(String title, String company, Department dept, User postedBy,
                                        String description, String eligibility, String pkg, LocalDate lastDate) {
        PlacementNotice notice = PlacementNotice.builder()
                .title(title)
                .companyName(company)
                .department(dept)
                .postedBy(postedBy)
                .description(description)
                .eligibilityCriteria(eligibility)
                .packageOffered(pkg)
                .lastDate(lastDate)
                .isActive(true)
                .build();
        placementNoticeRepository.save(notice);
    }

    private void seedNotifications(List<StudentProfile> sectionA, List<StudentProfile> sectionB) {
        List<StudentProfile> allStudents = new ArrayList<>();
        allStudents.addAll(sectionA);
        allStudents.addAll(sectionB);

        String[][] notifications = {
                {"Welcome to Semester 3!", "Your Semester 3 classes have started. Check your timetable for schedule details.", "ACADEMIC"},
                {"IA-1 Marks Published", "Internal Assessment 1 marks have been published. Check your marks section.", "ACADEMIC"},
                {"Fee Payment Reminder", "Your Semester 3 fee payment is due. Please clear your dues before the deadline.", "FEE"},
                {"New Placement Drive", "Google is visiting campus on " + LocalDate.now().plusDays(15) + ". Check placement notices for details.", "PLACEMENT"},
                {"Library Book Due", "You have library books due for return. Please return them to avoid fines.", "GENERAL"}
        };

        for (StudentProfile student : allStudents) {
            // Each student gets 3-5 random notifications
            int numNotifications = 3 + random.nextInt(3);
            List<String[]> shuffled = new ArrayList<>(Arrays.asList(notifications));
            Collections.shuffle(shuffled, random);

            for (int i = 0; i < Math.min(numNotifications, shuffled.size()); i++) {
                String[] notif = shuffled.get(i);
                Notification notification = Notification.builder()
                        .user(student.getUser())
                        .title(notif[0])
                        .message(notif[1])
                        .type(NotificationType.valueOf(notif[2]))
                        .isRead(random.nextBoolean())
                        .build();
                notificationRepository.save(notification);
            }
        }
    }
}
