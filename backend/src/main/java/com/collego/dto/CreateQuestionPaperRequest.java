package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuestionPaperRequest {

    @NotNull(message = "Course ID is required")
    private Long courseId;

    @NotNull(message = "Department ID is required")
    private Long departmentId;

    @NotBlank(message = "Exam type is required")
    private String examType; // MID_TERM, END_TERM, SUPPLEMENTARY

    @NotNull(message = "Year is required")
    private Integer year;

    @NotNull(message = "Semester number is required")
    private Integer semesterNumber;

    @NotBlank(message = "File name is required")
    private String fileName;
}
