package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A class timetable PDF for one department + academic year + section.
 * Uploaded by the Head of Department and shown to students of that exact class.
 */
@Entity
@Table(name = "class_timetables", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"department_id", "academic_year", "section_name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassTimetable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    /** 1 = I Year, 2 = II Year, 3 = III Year, 4 = Final Year. */
    @Column(name = "academic_year", nullable = false)
    private Integer year;

    @Column(name = "section_name", nullable = false, length = 20)
    private String sectionName;

    @Column(nullable = false)
    private String fileName;

    /** Storage key relative to the timetable bucket / local root. */
    @Column(nullable = false, length = 1000)
    private String filePath;

    @Column(length = 150)
    private String contentType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private FacultyProfile uploadedBy;

    @Column(nullable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
    }
}
