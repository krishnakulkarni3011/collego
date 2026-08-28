package com.collego.repository;

import com.collego.entity.InternalMarks;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InternalMarksRepository extends JpaRepository<InternalMarks, Long> {
    List<InternalMarks> findByStudentIdAndSectionId(Long studentId, Long sectionId);
    List<InternalMarks> findBySectionId(Long sectionId);
    List<InternalMarks> findByStudentId(Long studentId);
    List<InternalMarks> findByStudentIdAndSectionIdIn(Long studentId, List<Long> sectionIds);
    java.util.Optional<InternalMarks> findByStudentIdAndSectionIdAndExamName(Long studentId, Long sectionId, String examName);
}
