package com.collego.repository;

import com.collego.entity.CourseMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CourseMaterialRepository extends JpaRepository<CourseMaterial, Long> {
    List<CourseMaterial> findBySectionIdOrderByCreatedAtDesc(Long sectionId);
    List<CourseMaterial> findBySectionIdAndMaterialType(Long sectionId, String materialType);

    /** Every material shared by faculty in a department, across all sections and semesters. */
    @Query("SELECT m FROM CourseMaterial m JOIN FETCH m.section s JOIN FETCH s.course c " +
           "WHERE c.department.id = :departmentId ORDER BY m.createdAt DESC")
    List<CourseMaterial> findByDepartmentId(@Param("departmentId") Long departmentId);
}
