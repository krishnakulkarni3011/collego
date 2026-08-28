package com.collego.repository;

import com.collego.entity.QuestionPaper;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionPaperRepository extends JpaRepository<QuestionPaper, Long> {

    List<QuestionPaper> findByUploadedByIdOrderByCreatedAtDesc(Long userId);

    List<QuestionPaper> findByCourseIdOrderByYearDesc(Long courseId);

    List<QuestionPaper> findByStatus(String status);

    List<QuestionPaper> findByDepartmentIdAndStatus(Long departmentId, String status);

    List<QuestionPaper> findAllByOrderByCreatedAtDesc();

    long countByStatus(String status);

    /**
     * Phase 6: Flexible search/filter on the published repository.
     * All parameters are optional — pass null to skip that filter.
     */
    @Query("SELECT qp FROM QuestionPaper qp WHERE qp.status = 'APPROVED' " +
           "AND (:courseId IS NULL OR qp.course.id = :courseId) " +
           "AND (:departmentId IS NULL OR qp.department.id = :departmentId) " +
           "AND (:semesterNumber IS NULL OR qp.semesterNumber = :semesterNumber) " +
           "AND (:year IS NULL OR qp.year = :year) " +
           "AND (:examType IS NULL OR UPPER(qp.examType) = UPPER(:examType)) " +
           "ORDER BY qp.year DESC, qp.createdAt DESC")
    List<QuestionPaper> searchApproved(@Param("courseId") Long courseId,
                                       @Param("departmentId") Long departmentId,
                                       @Param("semesterNumber") Integer semesterNumber,
                                       @Param("year") Integer year,
                                       @Param("examType") String examType);

    /**
     * Phase 6: Increment download count atomically.
     */
    @Modifying
    @Query("UPDATE QuestionPaper qp SET qp.downloadCount = qp.downloadCount + 1 WHERE qp.id = :id")
    void incrementDownloadCount(@Param("id") Long id);

    /**
     * Phase 6: Popular papers — top downloads from approved set.
     */
    @Query("SELECT qp FROM QuestionPaper qp WHERE qp.status = 'APPROVED' ORDER BY qp.downloadCount DESC")
    List<QuestionPaper> findTopByDownloads();
}

