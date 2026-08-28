package com.collego.repository;

import com.collego.entity.InterviewSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewScheduleRepository extends JpaRepository<InterviewSchedule, Long> {

    List<InterviewSchedule> findByApplicationId(Long applicationId);

    List<InterviewSchedule> findByJobPostingId(Long jobPostingId);

    List<InterviewSchedule> findByApplicationIdOrderByRoundNumberAsc(Long applicationId);

    List<InterviewSchedule> findByJobPostingIdOrderByScheduledAtAsc(Long jobPostingId);
}
