package com.collego.repository;

import com.collego.entity.JobPosting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

    List<JobPosting> findByCompanyId(Long companyId);

    List<JobPosting> findByStatus(String status);

    /** All open postings ordered by deadline ascending */
    List<JobPosting> findByStatusOrderByApplicationDeadlineAsc(String status);

    /** Open postings whose allowedDepartmentCodes is null OR contains the given code */
    @Query("SELECT jp FROM JobPosting jp WHERE jp.status = 'OPEN' " +
           "AND (jp.allowedDepartmentCodes IS NULL OR jp.allowedDepartmentCodes LIKE %:deptCode%)")
    List<JobPosting> findOpenForDepartment(@Param("deptCode") String deptCode);

    /** All open postings for students with no department restriction */
    @Query("SELECT jp FROM JobPosting jp WHERE jp.status = 'OPEN' AND jp.allowedDepartmentCodes IS NULL " +
           "ORDER BY jp.applicationDeadline ASC")
    List<JobPosting> findOpenForAllDepartments();
}
