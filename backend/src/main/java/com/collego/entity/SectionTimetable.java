package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "section_timetables")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SectionTimetable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** One timetable per section — enforced by unique constraint */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false, unique = true)
    private Section section;

    /** Original file name shown to user */
    @Column(nullable = false)
    private String fileName;

    /** Path on disk relative to storage base */
    @Column(nullable = false)
    private String filePath;

    @Column(nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
    }
}
