package com.collego.repository;

import com.collego.entity.Newsletter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NewsletterRepository extends JpaRepository<Newsletter, Long> {
    List<Newsletter> findByDepartmentIdOrderByCreatedAtDesc(Long departmentId);
}
