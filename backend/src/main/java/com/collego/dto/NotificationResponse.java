package com.collego.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String title;
    private String message;
    private String type;
    private String category;
    private boolean read;
    private LocalDateTime createdAt;
    private String attachmentFileName;
    private boolean hasAttachment;
}
