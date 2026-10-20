package com.collego.repository;

import com.collego.entity.RevaluationRequest;
import com.collego.entity.RevaluationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface RevaluationRequestRepository extends JpaRepository<RevaluationRequest, Long> {
    List<RevaluationRequest> findByStudentIdOrderByRequestedAtDesc(Long studentId);
    List<RevaluationRequest> findAllByOrderByRequestedAtDesc();
    boolean existsByStudentIdAndCourseIdAndSemesterIdAndStatusIn(
            Long studentId, Long courseId, Long semesterId, Collection<RevaluationStatus> statuses);
}
