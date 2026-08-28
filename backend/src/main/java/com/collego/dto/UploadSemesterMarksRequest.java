package com.collego.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadSemesterMarksRequest {

    @NotNull(message = "Section ID is required")
    private Long sectionId;

    @NotNull(message = "Max marks is required")
    private Double maxMarks;

    @NotNull(message = "Marks entries are required")
    private List<StudentSemesterMarksEntry> entries;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentSemesterMarksEntry {
        @NotNull(message = "Student ID is required")
        private Long studentId;

        @NotNull(message = "Obtained marks is required")
        private Double obtainedMarks;
    }
}
