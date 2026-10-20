package com.collego.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeePaymentResponse {
    private Long id;
    private Long feeId;
    private String semesterName;
    private BigDecimal amount;
    private String method;
    private String status;
    private String receiptNumber;
    private String reference;
    private String remarks;
    private LocalDateTime paidAt;
    private boolean recordedByAdmin;
}
