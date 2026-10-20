package com.collego.repository;

import com.collego.entity.ExamSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, Long> {
    List<ExamSchedule> findByExamIdOrderByExamDateAscStartTimeAsc(Long examId);
    List<ExamSchedule> findByInvigilatorIdOrderByExamDateAscStartTimeAsc(Long facultyId);
    Optional<ExamSchedule> findByExamIdAndCourseIdAndSectionId(Long examId, Long courseId, Long sectionId);
    long countByExamId(Long examId);
    void deleteByExamId(Long examId);
}
