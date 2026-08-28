package com.collego.repository;

import com.collego.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByStudentIdAndSectionId(Long studentId, Long sectionId);
    List<Attendance> findBySectionIdAndDate(Long sectionId, LocalDate date);
    List<Attendance> findByStudentId(Long studentId);
    List<Attendance> findByStudentIdAndSectionIdIn(Long studentId, List<Long> sectionIds);
    long countByStudentIdAndSectionId(Long studentId, Long sectionId);
    long countByStudentIdAndSectionIdAndStatus(Long studentId, Long sectionId, com.collego.entity.AttendanceStatus status);
    java.util.Optional<Attendance> findByStudentIdAndSectionIdAndDate(Long studentId, Long sectionId, LocalDate date);
    List<Attendance> findBySectionId(Long sectionId);
}
