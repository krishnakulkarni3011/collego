package com.collego.repository;

import com.collego.entity.FacultyReminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FacultyReminderRepository extends JpaRepository<FacultyReminder, Long> {
    List<FacultyReminder> findByFacultyIdOrderByCompletedAscCreatedAtDesc(Long facultyId);

    Optional<FacultyReminder> findByIdAndFacultyId(Long id, Long facultyId);
}
