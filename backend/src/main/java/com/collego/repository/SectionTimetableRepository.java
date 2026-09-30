package com.collego.repository;

import com.collego.entity.SectionTimetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SectionTimetableRepository extends JpaRepository<SectionTimetable, Long> {
    Optional<SectionTimetable> findBySectionId(Long sectionId);
    boolean existsBySectionId(Long sectionId);
    void deleteBySectionId(Long sectionId);
}
