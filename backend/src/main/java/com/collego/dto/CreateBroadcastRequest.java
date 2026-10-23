package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBroadcastRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    /** ACADEMIC, PLACEMENT, FEE or GENERAL. Defaults to GENERAL. */
    private String type;

    /**
     * ALL_STUDENTS, YEAR_STUDENTS, DEPARTMENT_STUDENTS, ALL_FACULTY,
     * DEPARTMENT_FACULTY, STUDENT or FACULTY.
     */
    @NotBlank(message = "Audience is required")
    private String audience;

    /** Required for YEAR_STUDENTS: 1 = I Year … 4 = Final Year. */
    private Integer targetYear;

    /** Required for DEPARTMENT_* audiences. */
    private Long departmentId;

    /** Required for STUDENT / FACULTY single-recipient audiences. */
    private Long userId;
}
