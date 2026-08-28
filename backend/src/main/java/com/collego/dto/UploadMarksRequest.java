package com.collego.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadMarksRequest {

    @NotNull(message = "Section ID is required")
    private Long sectionId;

    @NotNull(message = "Exam name is required")
    private String examName; // e.g., "IA-1", "IA-2"

    @NotNull(message = "Max marks is required")
    private Double maxMarks;

    @NotNull(message = "Marks entries are required")
    private List<StudentMarksEntry> entries;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentMarksEntry {
        @NotNull(message = "Student ID is required")
        private Long studentId;

        @NotNull(message = "Obtained marks is required")
        private Double obtainedMarks;
    }
}
