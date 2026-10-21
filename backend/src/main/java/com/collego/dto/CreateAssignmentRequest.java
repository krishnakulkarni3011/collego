package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAssignmentRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    private LocalDate dueDate;

    private Integer maxMarks;

    private Long sectionId;

    /** 1 = I Year, 2 = II Year, 3 = III Year, 4 = Final Year. */
    private Integer targetYear;

    private String fileName;
}
