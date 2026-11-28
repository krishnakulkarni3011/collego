package com.collego.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampusEventResponse {
    private Long id;
    private String title;
    private String description;
    private LocalDate eventDate;
    private String posterName;
    private String posterContentType;
    private String posterUrl;
    private boolean active;
    private LocalDateTime createdAt;
}
