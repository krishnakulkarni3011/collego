package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "placement_notices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlacementNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String companyName;

    @Column(length = 2000)
    private String description;

    @Column(length = 1000)
    private String eligibilityCriteria;

    private String packageOffered;

    private LocalDate lastDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posted_by")
    private User postedBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime postedAt;

    @Builder.Default
    @Column(nullable = false)
    private boolean isActive = true;

    @PrePersist
    protected void onCreate() {
        postedAt = LocalDateTime.now();
    }
}
