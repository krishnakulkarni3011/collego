package com.collego.repository;

import com.collego.entity.Enrollment;
import com.collego.entity.EnrollmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    List<Enrollment> findByStudentId(Long studentId);
    List<Enrollment> findBySectionId(Long sectionId);
    Optional<Enrollment> findByStudentIdAndSectionId(Long studentId, Long sectionId);
    boolean existsByStudentIdAndSectionId(Long studentId, Long sectionId);
    List<Enrollment> findByStudentIdAndStatus(Long studentId, EnrollmentStatus status);
    long countBySectionId(Long sectionId);
    List<Enrollment> findByStudentIdAndSectionSemesterId(Long studentId, Long semesterId);
}
