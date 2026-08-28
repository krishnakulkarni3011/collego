package com.collego.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponse {
    private Long id;
    private String name;
    private String code;
    private Integer credits;
    private Long departmentId;
    private String departmentName;
    private String description;
    private LocalDateTime createdAt;
}
