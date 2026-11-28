package com.collego.repository;

import com.collego.entity.PromotionBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PromotionBatchRepository extends JpaRepository<PromotionBatch, Long> {
    List<PromotionBatch> findAllByOrderByCreatedAtDesc();

    boolean existsByFromSemesterAndAcademicYear(Integer fromSemester, String academicYear);
}
