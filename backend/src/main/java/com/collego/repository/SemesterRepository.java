package com.collego.repository;

import com.collego.entity.Semester;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, Long> {
    List<Semester> findByIsActiveTrue();
    Optional<Semester> findByNumberAndAcademicYear(Integer number, String academicYear);
    boolean existsByNumberAndAcademicYear(Integer number, String academicYear);
    List<Semester> findAllByOrderByNumberDesc();
}
