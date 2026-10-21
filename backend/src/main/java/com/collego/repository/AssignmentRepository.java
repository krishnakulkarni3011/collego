package com.collego.repository;

import com.collego.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findBySectionIdOrderByCreatedAtDesc(Long sectionId);
    List<Assignment> findBySectionIdIn(List<Long> sectionIds);

    /**
     * Every assignment shared by faculty in a department, across all sections and semesters,
     * limited to the student's academic year. Legacy rows with no target year stay visible.
     */
    @Query("SELECT a FROM Assignment a JOIN FETCH a.section s JOIN FETCH s.course c " +
           "WHERE c.department.id = :departmentId " +
           "AND (a.targetYear IS NULL OR a.targetYear = :targetYear) " +
           "ORDER BY a.createdAt DESC")
    List<Assignment> findByDepartmentIdAndTargetYear(@Param("departmentId") Long departmentId,
                                                     @Param("targetYear") Integer targetYear);
}
