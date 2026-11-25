package com.collego.repository;

import com.collego.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {
    Optional<Holiday> findBySectionIdAndDate(Long sectionId, LocalDate date);
    boolean existsBySectionIdAndDate(Long sectionId, LocalDate date);
    List<Holiday> findBySectionIdOrderByDateDesc(Long sectionId);
    List<Holiday> findBySectionIdInOrderByDateDesc(List<Long> sectionIds);
}
