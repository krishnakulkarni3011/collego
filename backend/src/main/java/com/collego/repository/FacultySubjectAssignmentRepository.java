package com.collego.repository;

import com.collego.entity.FacultySubjectAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FacultySubjectAssignmentRepository extends JpaRepository<FacultySubjectAssignment, Long> {
    List<FacultySubjectAssignment> findByFacultyId(Long facultyId);
    List<FacultySubjectAssignment> findByFacultyIdAndIsActiveTrue(Long facultyId);
    Optional<FacultySubjectAssignment> findByFacultyIdAndCourseIdAndSemesterId(Long facultyId, Long courseId, Long semesterId);
    List<FacultySubjectAssignment> findBySemesterId(Long semesterId);
    List<FacultySubjectAssignment> findByCourseId(Long courseId);
}