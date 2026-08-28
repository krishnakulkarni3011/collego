package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Phase 7 — Student resume file reference.
 * A student may have multiple resumes uploaded (versioned).
 * The "active" resume is used for applications by default.
 */
@Entity
@Table(name = "resumes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resume {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @Column(nullable = false)
    private String fileName;

    /** Relative path on local storage (S3 key in Phase 8) */
    @Column(name = "file_path", nullable = false)
    private String filePath;

    /** Human-readable version label, e.g., "Resume v2 - August 2025" */
    private String versionLabel;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true; // Only one resume should be active at a time

    @Column(nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
    }
}
