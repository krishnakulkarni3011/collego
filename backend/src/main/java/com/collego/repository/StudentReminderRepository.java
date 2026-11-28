package com.collego.repository;

import com.collego.entity.StudentReminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentReminderRepository extends JpaRepository<StudentReminder, Long> {

    List<StudentReminder> findByStudentIdOrderByCompletedAscCreatedAtDesc(Long studentId);

    Optional<StudentReminder> findByIdAndStudentId(Long id, Long studentId);
}
