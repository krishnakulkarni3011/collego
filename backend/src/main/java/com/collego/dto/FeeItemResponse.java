package com.collego.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeItemResponse {
    private String category;
    private String description;
    private BigDecimal amount;
}
