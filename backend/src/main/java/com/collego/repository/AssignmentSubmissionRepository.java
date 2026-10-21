package com.collego.repository;

import com.collego.entity.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {
    List<AssignmentSubmission> findByAssignmentIdOrderBySubmittedAtDesc(Long assignmentId);
    List<AssignmentSubmission> findByAssignment_Section_Id(Long sectionId);
    List<AssignmentSubmission> findByStudentId(Long studentId);
    Optional<AssignmentSubmission> findByAssignmentIdAndStudentId(Long assignmentId, Long studentId);
    long countByAssignmentId(Long assignmentId);
    long countByAssignmentIdAndStatus(Long assignmentId, com.collego.entity.SubmissionStatus status);
}
