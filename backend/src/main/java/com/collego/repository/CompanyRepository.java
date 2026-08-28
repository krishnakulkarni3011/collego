package com.collego.repository;

import com.collego.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findByNameIgnoreCase(String name);
    List<Company> findByActiveTrue();
    boolean existsByNameIgnoreCase(String name);
    long countByActiveTrue();
}
