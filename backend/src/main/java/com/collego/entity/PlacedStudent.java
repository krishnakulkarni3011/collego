package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Admin-recorded placement (student, company, salary, role and department). */
@Entity
@Table(name = "placed_students")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlacedStudent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    private String salary;

    private String role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
