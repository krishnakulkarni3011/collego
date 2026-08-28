package com.collego.repository;

import com.collego.entity.Fee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FeeRepository extends JpaRepository<Fee, Long> {
    List<Fee> findByStudentId(Long studentId);
    List<Fee> findByStudentIdAndSemesterId(Long studentId, Long semesterId);
    List<Fee> findByStudentIdOrderBySemesterNumberAsc(Long studentId);
}
