package com.collego.repository;

import com.collego.entity.FacultyProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FacultyProfileRepository extends JpaRepository<FacultyProfile, Long> {
    Optional<FacultyProfile> findByUserId(Long userId);
    List<FacultyProfile> findByDepartmentId(Long departmentId);
    long countByDepartmentId(Long departmentId);
    Optional<FacultyProfile> findByEmployeeId(String employeeId);
    List<FacultyProfile> findByDepartmentCode(String code);

    /**
     * Phase 10: faculty addresses are shown in the public faculty directory, so
     * the AI output guard must treat them as legitimately shareable for students.
     * Uses an explicit projection so no lazy association is touched.
     */
    @Query("select u.email from FacultyProfile f join f.user u where u.email is not null")
    List<String> findAllFacultyEmails();
}