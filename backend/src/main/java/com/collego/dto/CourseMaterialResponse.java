package com.collego.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseMaterialResponse {
    private Long id;
    private Long sectionId;
    private String courseName;
    private String courseCode;
    private String title;
    private String description;
    private String materialType;
    private String fileName;
    private Boolean hasFile; // true if a file is uploaded to S3 and downloadable
    private LocalDateTime createdAt;
}
