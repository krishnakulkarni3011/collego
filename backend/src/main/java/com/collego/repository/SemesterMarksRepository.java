package com.collego.repository;

import com.collego.entity.SemesterMarks;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SemesterMarksRepository extends JpaRepository<SemesterMarks, Long> {
    List<SemesterMarks> findByStudentIdAndSectionId(Long studentId, Long sectionId);
    List<SemesterMarks> findBySectionId(Long sectionId);
    List<SemesterMarks> findByStudentId(Long studentId);
    List<SemesterMarks> findByStudentIdAndSectionIdIn(Long studentId, List<Long> sectionIds);
    Optional<SemesterMarks> findByStudentIdAndSectionIdEquals(Long studentId, Long sectionId);
}
