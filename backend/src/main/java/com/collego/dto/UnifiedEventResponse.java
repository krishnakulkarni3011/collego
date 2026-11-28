package com.collego.dto;

import lombok.*;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnifiedEventResponse {
    private String id;
    private String source;      // Campus Event / Placement Drive
    private String title;
    private String description;
    private LocalDate date;
    private String posterUrl;
}
