package com.collego.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SectionResponse {
    private Long id;
    private String name;
    private Long courseId;
    private String courseName;
    private String courseCode;
    private Integer courseCredits;
    private Long semesterId;
    private String semesterName;
    private Long facultyId;
    private String facultyName;
    private long enrolledCount;
    private Integer maxCapacity;
    private String maleClassRep;
    private String femaleClassRep;
    private LocalDateTime createdAt;
}
