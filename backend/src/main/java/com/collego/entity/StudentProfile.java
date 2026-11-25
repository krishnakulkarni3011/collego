package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "student_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    private String enrollmentNumber;

    private Integer semester;

    private String section;

    private Integer admissionYear;

    /**
     * True when this student is the class representative for their
     * department + academic year + section. Nullable for existing rows;
     * null is treated as false.
     */
    @Builder.Default
    @Column(name = "is_cr")
    private Boolean isCr = false;
}
