package com.collego.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlacementNoticeResponse {
    private Long id;
    private String title;
    private String companyName;
    private String description;
    private String eligibilityCriteria;
    private String packageOffered;
    private LocalDate lastDate;
    private String departmentName;
    private LocalDateTime postedAt;
}
