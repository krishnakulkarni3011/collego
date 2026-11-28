package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Immutable archive row for a graduated student: only name, USN, department and years. */
@Entity
@Table(name = "graduated_students", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"enrollment_number", "years"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GraduatedStudent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id")
    private Long studentId;

    @Column(nullable = false)
    private String name;

    @Column(name = "enrollment_number", nullable = false)
    private String enrollmentNumber;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "department_name", nullable = false)
    private String departmentName;

    /** Admission to graduation span, e.g. "2023-27". */
    @Column(nullable = false)
    private String years;

    @Column(name = "graduated_at", updatable = false)
    private LocalDateTime graduatedAt;

    @PrePersist
    protected void onCreate() {
        if (graduatedAt == null) graduatedAt = LocalDateTime.now();
    }
}
