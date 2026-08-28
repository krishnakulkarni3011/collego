package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Phase 7 — Interview schedule for shortlisted applicants.
 * One schedule can apply to multiple applicants (Admin creates a schedule,
 * then links it to shortlisted PlacementApplications).
 */
@Entity
@Table(name = "interview_schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_posting_id", nullable = false)
    private JobPosting jobPosting;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private PlacementApplication application;

    @Column(nullable = false)
    private Integer roundNumber; // 1 = Technical, 2 = HR, etc.

    private String roundName; // e.g., "Technical Round 1", "HR Interview"

    @Column(nullable = false)
    private LocalDateTime scheduledAt; // Date + time of the interview

    private Integer durationMinutes;

    @Column(nullable = false)
    private String mode; // ONLINE, OFFLINE, HYBRID

    private String venue;        // Room/address for offline

    private String meetLink;     // Google Meet / Zoom link for online

    @Builder.Default
    private String outcome = "PENDING"; // PENDING, PASSED, FAILED, NO_SHOW

    @Column(length = 1000)
    private String interviewerNotes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
