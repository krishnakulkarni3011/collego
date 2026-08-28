package com.collego.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyResponse {
    private Long id;
    private String name;
    private String description;
    private String industry;
    private String website;
    private String location;
    private String contactEmail;
    private String contactPhone;
    private boolean active;
    private Long openJobCount;
    private LocalDateTime createdAt;
}
