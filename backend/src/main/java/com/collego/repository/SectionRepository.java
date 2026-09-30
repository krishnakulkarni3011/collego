package com.collego.repository;

import com.collego.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SectionRepository extends JpaRepository<Section, Long> {
    List<Section> findByCourseId(Long courseId);
    List<Section> findBySemesterId(Long semesterId);
    List<Section> findByFacultyId(Long facultyId);
    List<Section> findByCourseIdAndSemesterId(Long courseId, Long semesterId);
    List<Section> findByCourseDepartmentId(Long departmentId);
    boolean existsByNameAndCourseIdAndSemesterId(String name, Long courseId, Long semesterId);
}
