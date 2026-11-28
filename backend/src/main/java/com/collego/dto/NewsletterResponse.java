package com.collego.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsletterResponse {
    private Long id;
    private String title;
    private String fileName;
    private String departmentName;
    private String uploadedByName;
    private LocalDateTime createdAt;
}
