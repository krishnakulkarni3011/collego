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
    private LocalDate driveDate;
    private LocalDate lastDate;
    private Long departmentId;
    private String departmentName;
    private String attachmentName;
    private boolean hasAttachment;
    private boolean active;
    private LocalDateTime postedAt;
}
