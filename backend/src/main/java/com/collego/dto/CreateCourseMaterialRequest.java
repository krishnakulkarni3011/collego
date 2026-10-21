package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCourseMaterialRequest {

    @NotNull(message = "Section ID is required")
    private Long sectionId;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotBlank(message = "Material type is required")
    private String materialType; // SYLLABUS, NOTES, REFERENCE, OTHER

    /** 1 = I Year, 2 = II Year, 3 = III Year, 4 = Final Year. */
    private Integer targetYear;

    private String fileName;
}
