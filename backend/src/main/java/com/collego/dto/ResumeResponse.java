package com.collego.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeResponse {
    private Long id;
    private Long studentId;
    private String studentName;
    private String fileName;
    private String filePath;
    private String versionLabel;
    private boolean active;
    private LocalDateTime uploadedAt;
}
