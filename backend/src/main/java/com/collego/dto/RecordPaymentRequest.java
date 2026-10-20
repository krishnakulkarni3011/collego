package com.collego.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RecordPaymentRequest {

    /** Amount to pay. When omitted the full outstanding balance is paid. */
    @DecimalMin(value = "1.0", message = "Payment amount must be at least 1")
    private BigDecimal amount;

    /** UPI, CARD, NET_BANKING, CASH, CHEQUE, DD or DEMO. */
    @NotBlank(message = "Payment method is required")
    private String method;

    private String reference;

    private String remarks;
}
