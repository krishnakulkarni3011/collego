package com.collego.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkImportResponse {
    private int totalProcessed;
    private int successCount;
    private int failureCount;
    private List<String> errors;
}
