package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Phase 7 — A job posting by a company with eligibility rules.
 *
 * Eligibility engine fields:
 *  - minCgpa: student CGPA must be >= this value
 *  - maxBacklogs: student active backlogs (F-grade subjects) must be <= this value
 *  - allowedDepartmentCodes: comma-separated dept codes, null = all departments
 *  - minAdmissionYear / maxAdmissionYear: batch year range, null = no restriction
 */
@Entity
@Table(name = "job_postings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobPosting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    private String title; // e.g., "Software Engineer Intern"

    @Column(length = 3000)
    private String description;

    @Column(length = 1000)
    private String responsibilities;

    @Column(length = 1000)
    private String requirements;

    private String packageOffered; // e.g., "12 LPA"

    private String jobType; // FULL_TIME, INTERNSHIP, CONTRACT

    private String workMode; // REMOTE, ONSITE, HYBRID

    private String location;

    private Integer openPositions;

    // ==================== Eligibility Criteria ====================

    private Double minCgpa;               // null = no CGPA filter
    private Integer maxBacklogs;          // null = no backlog filter
    private String allowedDepartmentCodes; // comma-separated, null = all depts
    private Integer minAdmissionYear;     // null = no batch restriction
    private Integer maxAdmissionYear;     // null = no batch restriction

    // ==================== Timeline ====================

    private LocalDate applicationDeadline;

    private LocalDate driveDate;          // Expected placement drive date

    // ==================== Status ====================

    @Builder.Default
    @Column(nullable = false)
    private String status = "OPEN"; // OPEN, CLOSED, CANCELLED

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
