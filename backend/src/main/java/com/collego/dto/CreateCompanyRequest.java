package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCompanyRequest {

    @NotBlank(message = "Company name is required")
    private String name;

    private String description;
    private String industry;
    private String website;
    private String location;
    private String contactEmail;
    private String contactPhone;
}
