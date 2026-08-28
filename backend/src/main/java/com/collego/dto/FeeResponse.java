package com.collego.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeResponse {
    private Long id;
    private Long semesterId;
    private String semesterName;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private LocalDate dueDate;
    private String status;
    private LocalDateTime paidAt;
    private String transactionRef;
    private List<FeeItemResponse> items;
}
