package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

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

    private String division;

    private Integer admissionYear;

    /** ACTIVE, PROMOTED, HELD_BACK or GRADUATED. Null is treated as ACTIVE. */
    @Column(name = "promotion_status")
    private String promotionStatus;

    @Column(name = "graduated_at")
    private LocalDateTime graduatedAt;

    /**
     * True when this student is the class representative for their
     * department + academic year + section. Nullable for existing rows;
     * null is treated as false.
     */
    @Builder.Default
    @Column(name = "is_cr")
    private Boolean isCr = false;
}
