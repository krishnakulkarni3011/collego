package com.collego.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadAssignmentMarksRequest {

    @NotEmpty(message = "Marks entries are required")
    private List<StudentAssignmentMarksEntry> entries;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentAssignmentMarksEntry {
        @NotNull(message = "Student ID is required")
        private Long studentId;

        @NotNull(message = "Marks are required")
        @DecimalMin(value = "0.0", message = "Marks cannot be negative")
        private BigDecimal marks;
    }
}
