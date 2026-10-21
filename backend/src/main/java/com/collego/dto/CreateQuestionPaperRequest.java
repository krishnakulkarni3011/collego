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

    /** Kept for API compatibility. The faculty's own department is always used. */
    private Long departmentId;

    @NotBlank(message = "Exam type is required")
    private String examType; // MID_TERM, END_TERM, SUPPLEMENTARY

    @NotNull(message = "Year is required")
    private Integer year;

    @NotNull(message = "Semester number is required")
    private Integer semesterNumber;

    /** 1 = I Year, 2 = II Year, 3 = III Year, 4 = Final Year. */
    private Integer targetYear;

    @NotBlank(message = "File name is required")
    private String fileName;
}
