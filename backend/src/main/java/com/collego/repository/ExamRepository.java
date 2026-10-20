package com.collego.repository;

import com.collego.entity.Exam;
import com.collego.entity.ExamStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findAllByOrderByStartDateDesc();
    List<Exam> findBySemesterIdOrderByStartDateDesc(Long semesterId);
    List<Exam> findBySemesterNumberAndStatusNotOrderByStartDateAsc(Integer semesterNumber, ExamStatus status);
}
