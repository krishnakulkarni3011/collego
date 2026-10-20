package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A student's submission for an assignment. One submission per student per
 * assignment; re-submitting before grading replaces the file.
 */
@Entity
@Table(name = "assignment_submissions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"assignment_id", "student_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_name")
    private String fileName;

    private Long fileSize;

    private String contentType;

    @Column(length = 2000)
    private String note;

    @Builder.Default
    @Column(nullable = false)
    private boolean late = false;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private SubmissionStatus status = SubmissionStatus.SUBMITTED;

    @Column(precision = 6, scale = 2)
    private BigDecimal marks;

    @Column(length = 2000)
    private String feedback;

    private LocalDateTime submittedAt;

    private LocalDateTime gradedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "graded_by")
    private User gradedBy;

    @PrePersist
    @PreUpdate
    protected void touch() {
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
    }
}
