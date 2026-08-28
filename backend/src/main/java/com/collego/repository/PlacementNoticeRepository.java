package com.collego.repository;

import com.collego.entity.PlacementNotice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PlacementNoticeRepository extends JpaRepository<PlacementNotice, Long> {
    List<PlacementNotice> findByIsActiveTrueOrderByPostedAtDesc();

    @Query("SELECT p FROM PlacementNotice p WHERE p.isActive = true AND (p.department IS NULL OR p.department.id = :departmentId) ORDER BY p.postedAt DESC")
    List<PlacementNotice> findActiveByDepartmentOrAll(@Param("departmentId") Long departmentId);
}
