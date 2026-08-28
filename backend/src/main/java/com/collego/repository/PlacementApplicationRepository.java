package com.collego.repository;

import com.collego.entity.ApplicationStatus;
import com.collego.entity.PlacementApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlacementApplicationRepository extends JpaRepository<PlacementApplication, Long> {

    List<PlacementApplication> findByStudentIdOrderByAppliedAtDesc(Long studentId);

    List<PlacementApplication> findByJobPostingId(Long jobPostingId);

    List<PlacementApplication> findByJobPostingIdAndStatus(Long jobPostingId, ApplicationStatus status);

    Optional<PlacementApplication> findByStudentIdAndJobPostingId(Long studentId, Long jobPostingId);

    boolean existsByStudentIdAndJobPostingId(Long studentId, Long jobPostingId);

    long countByJobPostingId(Long jobPostingId);

    long countByJobPostingIdAndStatus(Long jobPostingId, ApplicationStatus status);

    /** Count students placed (SELECTED) across all postings */
    long countByStatus(ApplicationStatus status);

    /** Count unique students placed */
    @Query("SELECT COUNT(DISTINCT pa.student.id) FROM PlacementApplication pa WHERE pa.status = 'SELECTED'")
    long countDistinctStudentsPlaced();

    /** Applications for all postings of a given company */
    @Query("SELECT pa FROM PlacementApplication pa WHERE pa.jobPosting.company.id = :companyId")
    List<PlacementApplication> findByCompanyId(@Param("companyId") Long companyId);

    /** Selected applications for reporting */
    List<PlacementApplication> findByStatus(ApplicationStatus status);
}
