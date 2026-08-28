package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateNoticeRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Message content is required")
    private String message;

    private String type; // ACADEMIC, GENERAL, etc. — defaults to GENERAL

    private Long departmentId; // null = all departments
}
