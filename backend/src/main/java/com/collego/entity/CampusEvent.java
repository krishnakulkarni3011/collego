package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Campus-wide event published by the Admin and shown on all three dashboards. */
@Entity
@Table(name = "campus_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampusEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(name = "event_date")
    private LocalDate eventDate;

    @Column(name = "poster_name")
    private String posterName;

    @Column(name = "poster_path", length = 500)
    private String posterPath;

    @Column(name = "poster_content_type")
    private String posterContentType;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_by")
    private String createdBy;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
