package com.collego.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionPaperResponse {
    private Long id;
    private String courseName;
    private String courseCode;
    private String departmentName;
    private String examType;
    private Integer year;
    private Integer semesterNumber;
    private String fileName;
    private String filePath;
    private String status;
    private String uploadedByName;
    private Long downloadCount;
    private LocalDateTime createdAt;
}
