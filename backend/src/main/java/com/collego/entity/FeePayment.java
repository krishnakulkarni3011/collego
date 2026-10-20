package com.collego.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * An individual payment against a fee record. Supports full and partial
 * (installment) payments. The linked Fee.paidAmount is the running total.
 */
@Entity
@Table(name = "fee_payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fee_id", nullable = false)
    private Fee fee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FeePaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private FeePaymentStatus status = FeePaymentStatus.SUCCESS;

    @Column(unique = true, nullable = false)
    private String receiptNumber;

    private String reference;

    @Column(length = 500)
    private String remarks;

    @Column(nullable = false)
    private LocalDateTime paidAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by")
    private User recordedBy;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (paidAt == null) paidAt = LocalDateTime.now();
    }
}
