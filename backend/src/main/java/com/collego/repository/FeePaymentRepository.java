package com.collego.repository;

import com.collego.entity.FeePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeePaymentRepository extends JpaRepository<FeePayment, Long> {
    List<FeePayment> findByFeeIdOrderByPaidAtDesc(Long feeId);
    List<FeePayment> findByStudentIdOrderByPaidAtDesc(Long studentId);
    Optional<FeePayment> findByReceiptNumber(String receiptNumber);
    boolean existsByReceiptNumber(String receiptNumber);
}
