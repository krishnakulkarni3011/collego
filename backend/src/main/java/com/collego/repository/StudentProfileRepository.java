package com.collego.repository;

import com.collego.entity.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    Optional<StudentProfile> findByUserId(Long userId);
    Optional<StudentProfile> findByUserEmailIgnoreCase(String email);
    List<StudentProfile> findByDepartmentId(Long departmentId);
    long countByDepartmentId(Long departmentId);
    Optional<StudentProfile> findByEnrollmentNumber(String enrollmentNumber);
    List<StudentProfile> findAllByEnrollmentNumber(String enrollmentNumber);
    List<StudentProfile> findByDepartmentCodeOrderByAdmissionYearAscEnrollmentNumberAsc(String code);
}
