package com.collego.service;

import com.collego.dto.FacultyPlacementDriveResponse;
import com.collego.entity.Department;
import com.collego.entity.PlacementNotice;
import com.collego.repository.CompanyRepository;
import com.collego.repository.DepartmentRepository;
import com.collego.repository.InterviewScheduleRepository;
import com.collego.repository.JobPostingRepository;
import com.collego.repository.PlacementApplicationRepository;
import com.collego.repository.PlacementNoticeRepository;
import com.collego.repository.ResumeRepository;
import com.collego.repository.SemesterMarksRepository;
import com.collego.repository.StudentProfileRepository;
import com.collego.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlacementServiceFacultyViewTest {

    @Mock private CompanyRepository companyRepository;
    @Mock private JobPostingRepository jobPostingRepository;
    @Mock private PlacementApplicationRepository applicationRepository;
    @Mock private ResumeRepository resumeRepository;
    @Mock private InterviewScheduleRepository interviewScheduleRepository;
    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private DepartmentRepository departmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private SemesterMarksRepository semesterMarksRepository;
    @Mock private PlacementNoticeRepository placementNoticeRepository;
    @Mock private S3StorageService s3StorageService;

    @InjectMocks private PlacementService placementService;

    @Test
    void returnsOnlyTheFieldsRequiredByTheFacultyView() {
        Department department = Department.builder()
                .id(1L).name("Computer Science").code("CSE").build();
        PlacementNotice notice = PlacementNotice.builder()
                .title("Graduate Engineer Trainee")
                .companyName("Acme Corp")
                .packageOffered("6 LPA")
                .driveDate(LocalDate.now().plusDays(5))
                .department(department)
                .eligibilityCriteria("CGPA >= 7.0")
                .description("Internal description")
                .attachmentName("secret.pdf")
                .build();
        when(placementNoticeRepository
                .findByIsActiveTrueAndDriveDateGreaterThanEqualOrderByDriveDateAsc(any(LocalDate.class)))
                .thenReturn(List.of(notice));

        List<FacultyPlacementDriveResponse> result =
                placementService.getUpcomingPlacementDrivesForFaculty();

        assertEquals(1, result.size());
        FacultyPlacementDriveResponse drive = result.get(0);
        assertEquals("Graduate Engineer Trainee", drive.getTitle());
        assertEquals("Acme Corp", drive.getCompanyName());
        assertEquals("6 LPA", drive.getPackageOffered());
        assertEquals(notice.getDriveDate(), drive.getDriveDate());
        assertEquals("Computer Science", drive.getDepartmentName());
        assertEquals("CGPA >= 7.0", drive.getEligibilityCriteria());
    }
}
