package com.collego.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class BulkEnrollRequest {
    @NotNull(message = "Section ID is required")
    private Long sectionId;

    @NotEmpty(message = "Student IDs list cannot be empty")
    private List<Long> studentIds;
}
