package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "promotion_batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromotionBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "from_semester", nullable = false)
    private Integer fromSemester;

    @Column(name = "to_semester", nullable = false)
    private Integer toSemester;

    @Column(name = "academic_year")
    private String academicYear;

    @Builder.Default
    @Column(nullable = false)
    private String status = "COMPLETED";

    @Builder.Default
    @Column(name = "total_students", nullable = false)
    private Integer totalStudents = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer promoted = 0;

    @Builder.Default
    @Column(name = "held_back", nullable = false)
    private Integer heldBack = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer graduated = 0;

    @Column(name = "created_by")
    private String createdBy;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
