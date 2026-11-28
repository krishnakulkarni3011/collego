package com.collego.repository;

import com.collego.entity.PlacedStudent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlacedStudentRepository extends JpaRepository<PlacedStudent, Long> {
    List<PlacedStudent> findAllByOrderByCreatedAtDesc();

    List<PlacedStudent> findByStudentId(Long studentId);

    List<PlacedStudent> findByDepartmentId(Long departmentId);
}
