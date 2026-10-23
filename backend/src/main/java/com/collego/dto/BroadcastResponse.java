package com.collego.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BroadcastResponse {
    private Long id;
    private String title;
    private String message;
    private String type;
    private String audience;
    private String audienceLabel;
    private Integer targetYear;
    private Long departmentId;
    private String departmentName;
    private String recipientName;
    private int recipientCount;
    private LocalDateTime createdAt;
}
