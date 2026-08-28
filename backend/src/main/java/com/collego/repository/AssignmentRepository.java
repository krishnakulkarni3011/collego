package com.collego.repository;

import com.collego.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findBySectionIdOrderByCreatedAtDesc(Long sectionId);
    List<Assignment> findBySectionIdIn(List<Long> sectionIds);
}
