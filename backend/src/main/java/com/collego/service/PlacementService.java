package com.collego.service;

import com.collego.dto.*;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.exception.ConflictException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Phase 7 — Placement Management Service.
 *
 * Covers:
 *  - Company CRUD (Admin)
 *  - Job posting CRUD with eligibility criteria (Admin)
 *  - Eligibility auto-filtering per student
 *  - Resume upload / management (Student)
 *  - Application submission (Student)
 *  - Application status management (Admin)
 *  - Interview scheduling (Admin)
 *  - Placement statistics (Admin + Student)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlacementService {

    private final CompanyRepository companyRepository;
    private final JobPostingRepository jobPostingRepository;
    private final PlacementApplicationRepository applicationRepository;
    private final ResumeRepository resumeRepository;
    private final InterviewScheduleRepository interviewScheduleRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final SemesterMarksRepository semesterMarksRepository;
    private final S3StorageService s3StorageService;

    @Value("${collego.aws.s3-bucket-resumes:collego-resumes-prod}")
    private String resumeS3Bucket;

    // ============================================================
    // COMPANY MANAGEMENT (Admin)
    // ============================================================

    @Transactional
    public CompanyResponse createCompany(CreateCompanyRequest request) {
        if (companyRepository.existsByNameIgnoreCase(request.getName())) {
            throw new ConflictException("Company already exists: " + request.getName());
        }
        Company company = Company.builder()
                .name(request.getName())
                .description(request.getDescription())
                .industry(request.getIndustry())
                .website(request.getWebsite())
                .location(request.getLocation())
                .contactEmail(request.getContactEmail())
                .contactPhone(request.getContactPhone())
                .build();
        company = companyRepository.save(company);
        log.info("Created company: {}", company.getName());
        return mapCompanyToResponse(company);
    }

    public List<CompanyResponse> getAllCompanies() {
        return companyRepository.findAll().stream()
                .map(this::mapCompanyToResponse)
                .collect(Collectors.toList());
    }

    public List<CompanyResponse> getActiveCompanies() {
        return companyRepository.findByActiveTrue().stream()
                .map(this::mapCompanyToResponse)
                .collect(Collectors.toList());
    }

    public CompanyResponse getCompanyById(Long id) {
        return mapCompanyToResponse(findCompanyById(id));
    }

    @Transactional
    public CompanyResponse updateCompany(Long id, CreateCompanyRequest request) {
        Company company = findCompanyById(id);
        if (request.getName() != null && !request.getName().equals(company.getName())) {
            if (companyRepository.existsByNameIgnoreCase(request.getName())) {
                throw new ConflictException("Company name already taken: " + request.getName());
            }
            company.setName(request.getName());
        }
        if (request.getDescription() != null)  company.setDescription(request.getDescription());
        if (request.getIndustry() != null)     company.setIndustry(request.getIndustry());
        if (request.getWebsite() != null)      company.setWebsite(request.getWebsite());
        if (request.getLocation() != null)     company.setLocation(request.getLocation());
        if (request.getContactEmail() != null) company.setContactEmail(request.getContactEmail());
        if (request.getContactPhone() != null) company.setContactPhone(request.getContactPhone());
        companyRepository.save(company);
        return mapCompanyToResponse(company);
    }

    @Transactional
    public void deactivateCompany(Long id) {
        Company company = findCompanyById(id);
        company.setActive(false);
        companyRepository.save(company);
        log.info("Deactivated company: {}", company.getName());
    }

    // ============================================================
    // JOB POSTING MANAGEMENT (Admin)
    // ============================================================

    @Transactional
    public JobPostingResponse createJobPosting(CreateJobPostingRequest request) {
        Company company = findCompanyById(request.getCompanyId());

        JobPosting posting = JobPosting.builder()
                .company(company)
                .title(request.getTitle())
                .description(request.getDescription())
                .responsibilities(request.getResponsibilities())
                .requirements(request.getRequirements())
                .packageOffered(request.getPackageOffered())
                .jobType(request.getJobType())
                .workMode(request.getWorkMode())
                .location(request.getLocation())
                .openPositions(request.getOpenPositions())
                .minCgpa(request.getMinCgpa())
                .maxBacklogs(request.getMaxBacklogs())
                .allowedDepartmentCodes(normalizeDepCodes(request.getAllowedDepartmentCodes()))
                .minAdmissionYear(request.getMinAdmissionYear())
                .maxAdmissionYear(request.getMaxAdmissionYear())
                .applicationDeadline(request.getApplicationDeadline())
                .driveDate(request.getDriveDate())
                .build();

        posting = jobPostingRepository.save(posting);
        log.info("Created job posting '{}' for company '{}'", posting.getTitle(), company.getName());
        return mapJobPostingToResponse(posting, null);
    }

    public List<JobPostingResponse> getAllJobPostings() {
        return jobPostingRepository.findAll().stream()
                .map(p -> mapJobPostingToResponse(p, null))
                .collect(Collectors.toList());
    }

    public JobPostingResponse getJobPostingById(Long id) {
        return mapJobPostingToResponse(findJobPostingById(id), null);
    }

    @Transactional
    public JobPostingResponse updateJobPostingStatus(Long id, String status) {
        JobPosting posting = findJobPostingById(id);
        if (!List.of("OPEN", "CLOSED", "CANCELLED").contains(status.toUpperCase())) {
            throw new BadRequestException("Invalid status. Must be OPEN, CLOSED, or CANCELLED.");
        }
        posting.setStatus(status.toUpperCase());
        jobPostingRepository.save(posting);
        log.info("Updated job posting {} status to {}", id, status);
        return mapJobPostingToResponse(posting, null);
    }

    // ============================================================
    // STUDENT VIEW — Eligible Job Listings
    // ============================================================

    /**
     * Returns all OPEN job postings, annotated with eligibility and application
     * status for the requesting student. Postings the student is ineligible for
     * are still returned but marked isEligible=false — giving students visibility
     * into what they can work toward.
     */
    public List<JobPostingResponse> getJobPostingsForStudent(String email) {
        StudentProfile student = getStudentByEmail(email);
        List<JobPosting> postings = jobPostingRepository.findByStatus("OPEN");

        return postings.stream()
                .map(p -> {
                    boolean eligible = isEligible(student, p);
                    boolean applied = applicationRepository.existsByStudentIdAndJobPostingId(
                            student.getId(), p.getId());
                    JobPostingResponse r = mapJobPostingToResponse(p, student.getId());
                    r.setIsEligible(eligible);
                    r.setHasApplied(applied);
                    return r;
                })
                .sorted(Comparator
                        .comparing(JobPostingResponse::getIsEligible, Comparator.reverseOrder())
                        .thenComparing(JobPostingResponse::getApplicationDeadline,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    // ============================================================
    // ELIGIBILITY ENGINE
    // ============================================================

    /**
     * Determines whether a student meets all eligibility criteria for a job posting.
     * Rules checked (all must pass):
     *  1. Department filter (if posting restricts departments)
     *  2. Admission year / batch year range
     *  3. Minimum CGPA
     *  4. Maximum active backlogs
     */
    public boolean isEligible(StudentProfile student, JobPosting posting) {
        // 1. Department filter
        if (posting.getAllowedDepartmentCodes() != null && !posting.getAllowedDepartmentCodes().isBlank()) {
            if (student.getDepartment() == null) return false;
            String studentDeptCode = student.getDepartment().getCode().toUpperCase();
            boolean deptMatch = Arrays.stream(posting.getAllowedDepartmentCodes().split(","))
                    .map(String::trim)
                    .map(String::toUpperCase)
                    .anyMatch(code -> code.equals(studentDeptCode));
            if (!deptMatch) return false;
        }

        // 2. Admission year filter
        if (posting.getMinAdmissionYear() != null && student.getAdmissionYear() != null
                && student.getAdmissionYear() < posting.getMinAdmissionYear()) return false;
        if (posting.getMaxAdmissionYear() != null && student.getAdmissionYear() != null
                && student.getAdmissionYear() > posting.getMaxAdmissionYear()) return false;

        // 3. Minimum CGPA
        if (posting.getMinCgpa() != null) {
            double cgpa = calculateStudentCgpa(student.getId());
            if (cgpa < posting.getMinCgpa()) return false;
        }

        // 4. Maximum backlogs
        if (posting.getMaxBacklogs() != null) {
            int backlogs = countActiveBacklogs(student.getId());
            if (backlogs > posting.getMaxBacklogs()) return false;
        }

        return true;
    }

    /** Calculates a student's CGPA from all semester marks on record. */
    private double calculateStudentCgpa(Long studentId) {
        List<SemesterMarks> allMarks = semesterMarksRepository.findByStudentId(studentId);
        double totalCreditPoints = 0;
        double totalCredits = 0;
        for (SemesterMarks m : allMarks) {
            if (m.getGradePoints() != null) {
                double credits = m.getSection().getCourse().getCredits();
                totalCreditPoints += credits * m.getGradePoints();
                totalCredits += credits;
            }
        }
        if (totalCredits == 0) return 0.0;
        return Math.round((totalCreditPoints / totalCredits) * 100.0) / 100.0;
    }

    /** Counts subjects where grade = 'F' (active backlog). */
    private int countActiveBacklogs(Long studentId) {
        return (int) semesterMarksRepository.findByStudentId(studentId).stream()
                .filter(m -> "F".equals(m.getGrade()))
                .count();
    }

    // ============================================================
    // RESUME MANAGEMENT (Student)
    // ============================================================

    /**
     * Upload a new resume file for the student to S3.
     * If setActive=true, deactivates all previous resumes.
     */
    @Transactional
    public ResumeResponse uploadResume(String email, MultipartFile file, String versionLabel,
                                       boolean setActive) throws IOException {
        StudentProfile student = getStudentByEmail(email);
        validateResumeFile(file);

        String uniqueName = UUID.randomUUID() + "_" + sanitizeFilename(file.getOriginalFilename());
        String s3Key = student.getId() + "/" + uniqueName;
        String contentType = S3StorageService.detectContentType(file.getOriginalFilename());

        // Upload to S3
        s3StorageService.upload(resumeS3Bucket, s3Key, file.getInputStream(),
                file.getSize(), contentType);

        if (setActive) {
            // Deactivate previous active resume
            resumeRepository.findByStudentIdAndActiveTrue(student.getId())
                    .ifPresent(r -> { r.setActive(false); resumeRepository.save(r); });
        }

        Resume resume = Resume.builder()
                .student(student)
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : uniqueName)
                .filePath(s3Key)
                .versionLabel(versionLabel)
                .active(setActive)
                .build();
        resume = resumeRepository.save(resume);

        log.info("Student {} uploaded resume to S3: s3://{}/{}", email, resumeS3Bucket, s3Key);
        return mapResumeToResponse(resume);
    }

    public List<ResumeResponse> getMyResumes(String email) {
        StudentProfile student = getStudentByEmail(email);
        return resumeRepository.findByStudentIdOrderByUploadedAtDesc(student.getId()).stream()
                .map(this::mapResumeToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ResumeResponse setActiveResume(String email, Long resumeId) {
        StudentProfile student = getStudentByEmail(email);
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found: " + resumeId));
        if (!resume.getStudent().getId().equals(student.getId())) {
            throw new BadRequestException("Resume does not belong to this student.");
        }
        // Deactivate current active
        resumeRepository.findByStudentIdAndActiveTrue(student.getId())
                .ifPresent(r -> { r.setActive(false); resumeRepository.save(r); });
        resume.setActive(true);
        resumeRepository.save(resume);
        return mapResumeToResponse(resume);
    }

    public byte[] downloadResume(String email, Long resumeId) throws IOException {
        StudentProfile student = getStudentByEmail(email);
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found: " + resumeId));
        // Students can only download their own; admin can download any (handled at controller)
        if (!resume.getStudent().getId().equals(student.getId())) {
            throw new BadRequestException("Access denied to this resume.");
        }
        return s3StorageService.download(resumeS3Bucket, resume.getFilePath());
    }

    public byte[] downloadResumeByAdmin(Long resumeId) throws IOException {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found: " + resumeId));
        return s3StorageService.download(resumeS3Bucket, resume.getFilePath());
    }

    // ============================================================
    // APPLICATION SUBMISSION (Student)
    // ============================================================

    @Transactional
    public ApplicationResponse applyForJob(String email, ApplyJobRequest request) {
        StudentProfile student = getStudentByEmail(email);
        JobPosting posting = findJobPostingById(request.getJobPostingId());

        // Check posting is open
        if (!"OPEN".equals(posting.getStatus())) {
            throw new BadRequestException("Job posting is not open for applications.");
        }

        // Check eligibility
        if (!isEligible(student, posting)) {
            throw new BadRequestException("You do not meet the eligibility criteria for this posting.");
        }

        // Check duplicate application
        if (applicationRepository.existsByStudentIdAndJobPostingId(student.getId(), posting.getId())) {
            throw new ConflictException("You have already applied for this job posting.");
        }

        // Resolve resume
        Resume resume = null;
        if (request.getResumeId() != null) {
            resume = resumeRepository.findById(request.getResumeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Resume not found: " + request.getResumeId()));
            if (!resume.getStudent().getId().equals(student.getId())) {
                throw new BadRequestException("Resume does not belong to you.");
            }
        } else {
            resume = resumeRepository.findByStudentIdAndActiveTrue(student.getId()).orElse(null);
        }

        PlacementApplication app = PlacementApplication.builder()
                .student(student)
                .jobPosting(posting)
                .resume(resume)
                .coverNote(request.getCoverNote())
                .status(ApplicationStatus.APPLIED)
                .build();
        app = applicationRepository.save(app);

        log.info("Student {} applied for job posting {} ({})", email, posting.getId(), posting.getTitle());
        return mapApplicationToResponse(app);
    }

    @Transactional
    public ApplicationResponse withdrawApplication(String email, Long applicationId) {
        StudentProfile student = getStudentByEmail(email);
        PlacementApplication app = findApplicationById(applicationId);
        if (!app.getStudent().getId().equals(student.getId())) {
            throw new BadRequestException("Application does not belong to you.");
        }
        if (app.getStatus() == ApplicationStatus.SELECTED) {
            throw new BadRequestException("Cannot withdraw a SELECTED application.");
        }
        app.setStatus(ApplicationStatus.WITHDRAWN);
        applicationRepository.save(app);
        return mapApplicationToResponse(app);
    }

    public List<ApplicationResponse> getMyApplications(String email) {
        StudentProfile student = getStudentByEmail(email);
        return applicationRepository.findByStudentIdOrderByAppliedAtDesc(student.getId()).stream()
                .map(this::mapApplicationToResponse)
                .collect(Collectors.toList());
    }

    // ============================================================
    // APPLICATION MANAGEMENT (Admin)
    // ============================================================

    public List<ApplicationResponse> getApplicationsForPosting(Long jobPostingId) {
        return applicationRepository.findByJobPostingId(jobPostingId).stream()
                .map(this::mapApplicationToResponse)
                .collect(Collectors.toList());
    }

    public List<ApplicationResponse> getApplicationsForPosting(Long jobPostingId, String status) {
        ApplicationStatus appStatus = parseStatus(status);
        return applicationRepository.findByJobPostingIdAndStatus(jobPostingId, appStatus).stream()
                .map(this::mapApplicationToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ApplicationResponse updateApplicationStatus(Long applicationId, String status, String adminNotes) {
        PlacementApplication app = findApplicationById(applicationId);
        app.setStatus(parseStatus(status));
        if (adminNotes != null) app.setAdminNotes(adminNotes);
        applicationRepository.save(app);

        // If shortlisted, update application status to SHORTLISTED
        log.info("Updated application {} status to {}", applicationId, status);
        return mapApplicationToResponse(app);
    }

    // ============================================================
    // INTERVIEW SCHEDULE (Admin)
    // ============================================================

    @Transactional
    public InterviewScheduleResponse scheduleInterview(CreateInterviewScheduleRequest request) {
        PlacementApplication app = findApplicationById(request.getApplicationId());

        // Auto-update application status to INTERVIEW_SCHEDULED
        if (app.getStatus() == ApplicationStatus.SHORTLISTED ||
                app.getStatus() == ApplicationStatus.APPLIED) {
            app.setStatus(ApplicationStatus.INTERVIEW_SCHEDULED);
            applicationRepository.save(app);
        }

        InterviewSchedule schedule = InterviewSchedule.builder()
                .jobPosting(app.getJobPosting())
                .application(app)
                .roundNumber(request.getRoundNumber())
                .roundName(request.getRoundName())
                .scheduledAt(request.getScheduledAt())
                .durationMinutes(request.getDurationMinutes())
                .mode(request.getMode().toUpperCase())
                .venue(request.getVenue())
                .meetLink(request.getMeetLink())
                .outcome("PENDING")
                .build();

        schedule = interviewScheduleRepository.save(schedule);
        log.info("Scheduled interview round {} for application {}", request.getRoundNumber(), app.getId());
        return mapInterviewToResponse(schedule);
    }

    public List<InterviewScheduleResponse> getInterviewsForPosting(Long jobPostingId) {
        return interviewScheduleRepository.findByJobPostingIdOrderByScheduledAtAsc(jobPostingId).stream()
                .map(this::mapInterviewToResponse)
                .collect(Collectors.toList());
    }

    public List<InterviewScheduleResponse> getMyInterviews(String email) {
        StudentProfile student = getStudentByEmail(email);
        // Get all applications for this student
        List<PlacementApplication> apps = applicationRepository.findByStudentIdOrderByAppliedAtDesc(student.getId());
        return apps.stream()
                .flatMap(app -> interviewScheduleRepository.findByApplicationIdOrderByRoundNumberAsc(app.getId()).stream())
                .map(this::mapInterviewToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public InterviewScheduleResponse updateInterviewOutcome(Long scheduleId, String outcome, String notes) {
        InterviewSchedule schedule = interviewScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview schedule not found: " + scheduleId));
        if (!List.of("PENDING", "PASSED", "FAILED", "NO_SHOW").contains(outcome.toUpperCase())) {
            throw new BadRequestException("Invalid outcome. Must be: PENDING, PASSED, FAILED, NO_SHOW");
        }
        schedule.setOutcome(outcome.toUpperCase());
        if (notes != null) schedule.setInterviewerNotes(notes);
        interviewScheduleRepository.save(schedule);
        return mapInterviewToResponse(schedule);
    }

    // ============================================================
    // PLACEMENT STATISTICS
    // ============================================================

    public PlacementStatsResponse getPlacementStats() {
        long totalCompanies = companyRepository.countByActiveTrue();
        long openPostings = jobPostingRepository.findByStatus("OPEN").size();
        long totalApplications = applicationRepository.count();
        long studentsPlaced = applicationRepository.countDistinctStudentsPlaced();
        long totalOffers = applicationRepository.countByStatus(ApplicationStatus.SELECTED);
        long shortlisted = applicationRepository.countByStatus(ApplicationStatus.SHORTLISTED);
        long pending = applicationRepository.countByStatus(ApplicationStatus.APPLIED);

        long totalStudents = studentProfileRepository.count();
        double placementRate = totalStudents > 0
                ? Math.round((studentsPlaced * 100.0 / totalStudents) * 100.0) / 100.0
                : 0.0;

        // Department breakdown
        List<PlacementStatsResponse.DepartmentPlacementEntry> deptBreakdown =
                buildDepartmentBreakdown();

        // Top companies by offers
        List<PlacementStatsResponse.CompanyPlacementEntry> topCompanies =
                buildTopCompanies();

        return PlacementStatsResponse.builder()
                .totalCompanies(totalCompanies)
                .openJobPostings(openPostings)
                .totalApplications(totalApplications)
                .studentsPlaced(studentsPlaced)
                .totalOffersExtended(totalOffers)
                .shortlistedCount(shortlisted)
                .pendingCount(pending)
                .placementRate(placementRate)
                .departmentBreakdown(deptBreakdown)
                .topCompanies(topCompanies)
                .build();
    }

    private List<PlacementStatsResponse.DepartmentPlacementEntry> buildDepartmentBreakdown() {
        return departmentRepository.findAll().stream().map(dept -> {
            long totalStudents = studentProfileRepository.countByDepartmentId(dept.getId());

            List<StudentProfile> students = studentProfileRepository.findByDepartmentId(dept.getId());
            long applied = students.stream()
                    .filter(s -> !applicationRepository.findByStudentIdOrderByAppliedAtDesc(s.getId()).isEmpty())
                    .count();
            long placed = students.stream()
                    .filter(s -> applicationRepository.findByStudentIdOrderByAppliedAtDesc(s.getId())
                            .stream().anyMatch(a -> a.getStatus() == ApplicationStatus.SELECTED))
                    .count();
            double rate = totalStudents > 0
                    ? Math.round((placed * 100.0 / totalStudents) * 100.0) / 100.0
                    : 0.0;

            return PlacementStatsResponse.DepartmentPlacementEntry.builder()
                    .departmentName(dept.getName())
                    .departmentCode(dept.getCode())
                    .totalStudents(totalStudents)
                    .studentsApplied(applied)
                    .studentsPlaced(placed)
                    .placementRate(rate)
                    .build();
        }).collect(Collectors.toList());
    }

    private List<PlacementStatsResponse.CompanyPlacementEntry> buildTopCompanies() {
        return companyRepository.findAll().stream()
                .map(company -> {
                    List<PlacementApplication> apps = applicationRepository.findByCompanyId(company.getId());
                    long offers = apps.stream()
                            .filter(a -> a.getStatus() == ApplicationStatus.SELECTED).count();

                    // Highest package from their postings
                    String highestPackage = jobPostingRepository.findByCompanyId(company.getId()).stream()
                            .filter(p -> p.getPackageOffered() != null)
                            .map(JobPosting::getPackageOffered)
                            .findFirst().orElse(null);

                    return PlacementStatsResponse.CompanyPlacementEntry.builder()
                            .companyId(company.getId())
                            .companyName(company.getName())
                            .offersExtended(offers)
                            .highestPackage(highestPackage)
                            .build();
                })
                .filter(e -> e.getOffersExtended() > 0)
                .sorted(Comparator.comparingLong(PlacementStatsResponse.CompanyPlacementEntry::getOffersExtended)
                        .reversed())
                .collect(Collectors.toList());
    }

    // ============================================================
    // HELPERS & MAPPERS
    // ============================================================

    private Company findCompanyById(Long id) {
        return companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found: " + id));
    }

    private JobPosting findJobPostingById(Long id) {
        return jobPostingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job posting not found: " + id));
    }

    private PlacementApplication findApplicationById(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + id));
    }

    private StudentProfile getStudentByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
        return studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for: " + email));
    }

    private ApplicationStatus parseStatus(String status) {
        try {
            return ApplicationStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid application status: " + status +
                    ". Valid values: APPLIED, SHORTLISTED, INTERVIEW_SCHEDULED, SELECTED, REJECTED, WITHDRAWN");
        }
    }

    private String normalizeDepCodes(String codes) {
        if (codes == null || codes.isBlank()) return null;
        return Arrays.stream(codes.split(","))
                .map(String::trim)
                .map(String::toUpperCase)
                .collect(Collectors.joining(","));
    }

    private void validateResumeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File must not be empty.");
        }
        String name = file.getOriginalFilename();
        if (name != null && !name.toLowerCase().endsWith(".pdf") && !name.toLowerCase().endsWith(".docx")) {
            throw new BadRequestException("Only PDF and DOCX resumes are allowed.");
        }
    }

    private String sanitizeFilename(String name) {
        if (name == null) return "resume";
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private CompanyResponse mapCompanyToResponse(Company c) {
        long openJobs = jobPostingRepository.findByCompanyId(c.getId()).stream()
                .filter(p -> "OPEN".equals(p.getStatus())).count();
        return CompanyResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .description(c.getDescription())
                .industry(c.getIndustry())
                .website(c.getWebsite())
                .location(c.getLocation())
                .contactEmail(c.getContactEmail())
                .contactPhone(c.getContactPhone())
                .active(c.isActive())
                .openJobCount(openJobs)
                .createdAt(c.getCreatedAt())
                .build();
    }

    public JobPostingResponse mapJobPostingToResponse(JobPosting p, Long studentId) {
        long totalApps = applicationRepository.countByJobPostingId(p.getId());
        long shortlisted = applicationRepository.countByJobPostingIdAndStatus(
                p.getId(), ApplicationStatus.SHORTLISTED);
        long selected = applicationRepository.countByJobPostingIdAndStatus(
                p.getId(), ApplicationStatus.SELECTED);

        return JobPostingResponse.builder()
                .id(p.getId())
                .companyId(p.getCompany().getId())
                .companyName(p.getCompany().getName())
                .companyIndustry(p.getCompany().getIndustry())
                .title(p.getTitle())
                .description(p.getDescription())
                .responsibilities(p.getResponsibilities())
                .requirements(p.getRequirements())
                .packageOffered(p.getPackageOffered())
                .jobType(p.getJobType())
                .workMode(p.getWorkMode())
                .location(p.getLocation())
                .openPositions(p.getOpenPositions())
                .minCgpa(p.getMinCgpa())
                .maxBacklogs(p.getMaxBacklogs())
                .allowedDepartmentCodes(p.getAllowedDepartmentCodes())
                .minAdmissionYear(p.getMinAdmissionYear())
                .maxAdmissionYear(p.getMaxAdmissionYear())
                .applicationDeadline(p.getApplicationDeadline())
                .driveDate(p.getDriveDate())
                .status(p.getStatus())
                .totalApplications(totalApps)
                .shortlistedCount(shortlisted)
                .selectedCount(selected)
                .isEligible(null)
                .hasApplied(studentId != null
                        ? applicationRepository.existsByStudentIdAndJobPostingId(studentId, p.getId())
                        : null)
                .createdAt(p.getCreatedAt())
                .build();
    }

    private ApplicationResponse mapApplicationToResponse(PlacementApplication app) {
        StudentProfile student = app.getStudent();
        User user = student.getUser();
        double cgpa = calculateStudentCgpa(student.getId());

        return ApplicationResponse.builder()
                .id(app.getId())
                .studentId(student.getId())
                .studentName(user.getFirstName() + " " + user.getLastName())
                .enrollmentNumber(student.getEnrollmentNumber())
                .departmentName(student.getDepartment() != null ? student.getDepartment().getName() : null)
                .jobPostingId(app.getJobPosting().getId())
                .jobTitle(app.getJobPosting().getTitle())
                .companyName(app.getJobPosting().getCompany().getName())
                .resumeId(app.getResume() != null ? app.getResume().getId() : null)
                .resumeFileName(app.getResume() != null ? app.getResume().getFileName() : null)
                .status(app.getStatus().name())
                .coverNote(app.getCoverNote())
                .adminNotes(app.getAdminNotes())
                .cgpaAtApplication(cgpa)
                .appliedAt(app.getAppliedAt())
                .statusUpdatedAt(app.getStatusUpdatedAt())
                .build();
    }

    private ResumeResponse mapResumeToResponse(Resume r) {
        User user = r.getStudent().getUser();
        return ResumeResponse.builder()
                .id(r.getId())
                .studentId(r.getStudent().getId())
                .studentName(user.getFirstName() + " " + user.getLastName())
                .fileName(r.getFileName())
                .filePath(r.getFilePath())
                .versionLabel(r.getVersionLabel())
                .active(r.isActive())
                .uploadedAt(r.getUploadedAt())
                .build();
    }

    private InterviewScheduleResponse mapInterviewToResponse(InterviewSchedule s) {
        PlacementApplication app = s.getApplication();
        StudentProfile student = app.getStudent();
        User user = student.getUser();
        return InterviewScheduleResponse.builder()
                .id(s.getId())
                .applicationId(app.getId())
                .jobPostingId(s.getJobPosting().getId())
                .jobTitle(s.getJobPosting().getTitle())
                .companyName(s.getJobPosting().getCompany().getName())
                .studentName(user.getFirstName() + " " + user.getLastName())
                .enrollmentNumber(student.getEnrollmentNumber())
                .roundNumber(s.getRoundNumber())
                .roundName(s.getRoundName())
                .scheduledAt(s.getScheduledAt())
                .durationMinutes(s.getDurationMinutes())
                .mode(s.getMode())
                .venue(s.getVenue())
                .meetLink(s.getMeetLink())
                .outcome(s.getOutcome())
                .interviewerNotes(s.getInterviewerNotes())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
