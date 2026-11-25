package com.collego.repository;

import com.collego.entity.ClassTimetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassTimetableRepository extends JpaRepository<ClassTimetable, Long> {

    Optional<ClassTimetable> findByDepartmentIdAndYearAndSectionNameIgnoreCase(
            Long departmentId, Integer year, String sectionName);

    List<ClassTimetable> findByDepartmentIdOrderByYearAscSectionNameAsc(Long departmentId);
}
