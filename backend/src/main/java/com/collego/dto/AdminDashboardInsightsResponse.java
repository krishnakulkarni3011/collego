package com.collego.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Phase 10 — Aggregated payload for the Admin dashboard overview.
 * Surfaces real data (top performers, recent notices, upcoming placement events)
 * so the premium UI never needs hardcoded demo statistics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardInsightsResponse {

    private List<TopPerformer> topPerformers;
    private List<NoticeItem> recentNotices;
    private List<EventItem> upcomingEvents;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopPerformer {
        private Long studentId;
        private String studentName;
        private String enrollmentNumber;
        private String departmentName;
        private Integer semester;
        private double attendancePercentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NoticeItem {
        private Long id;
        private String title;
        private String message;
        private String type;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EventItem {
        private Long id;
        private String title;
        private String category;
        private String location;
        private String subtitle;
        private LocalDate date;
    }
}
