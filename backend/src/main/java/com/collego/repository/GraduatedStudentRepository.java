package com.collego.repository;

import com.collego.entity.GraduatedStudent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GraduatedStudentRepository extends JpaRepository<GraduatedStudent, Long> {
    List<GraduatedStudent> findAllByOrderByDepartmentNameAscEnrollmentNumberAsc();

    List<GraduatedStudent> findByDepartmentIdOrderByEnrollmentNumberAsc(Long departmentId);

    Optional<GraduatedStudent> findByEnrollmentNumberAndYears(String enrollmentNumber, String years);
}
