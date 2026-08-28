package com.collego.repository;

import com.collego.entity.TimetableSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TimetableSlotRepository extends JpaRepository<TimetableSlot, Long> {
    List<TimetableSlot> findBySectionId(Long sectionId);
    List<TimetableSlot> findBySectionIdIn(List<Long> sectionIds);
    List<TimetableSlot> findBySectionIdInOrderByDayOfWeekAscStartTimeAsc(List<Long> sectionIds);
}
