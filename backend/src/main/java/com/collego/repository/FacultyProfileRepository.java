package com.collego.repository;

import com.collego.entity.FacultyProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FacultyProfileRepository extends JpaRepository<FacultyProfile, Long> {
    Optional<FacultyProfile> findByUserId(Long userId);
    List<FacultyProfile> findByDepartmentId(Long departmentId);
    long countByDepartmentId(Long departmentId);
}
