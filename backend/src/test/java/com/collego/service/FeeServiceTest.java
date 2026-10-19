package com.collego.service;

import com.collego.controller.FeeController;
import com.collego.dto.FeeItemResponse;
import com.collego.dto.FeeResponse;
import com.collego.entity.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class FeeServiceTest {

    @Test
    void feeEntity_shouldMapAllFields() {
        // Build a Fee manually
        User user = User.builder().id(10L).email("student@collego.edu").role(Role.STUDENT).build();
        StudentProfile student = StudentProfile.builder().id(10L).user(user).build();
        Semester semester = Semester.builder().id(20L).name("Semester 3").number(3).build();

        FeeItem item = FeeItem.builder()
                .id(1L)
                .category(FeeCategory.ACADEMIC)
                .description("Tuition Fee")
                .amount(new BigDecimal("50000"))
                .build();

        Fee fee = Fee.builder()
                .id(100L)
                .student(student)
                .semester(semester)
                .totalAmount(new BigDecimal("60000"))
                .paidAmount(new BigDecimal("10000"))
                .dueDate(LocalDate.of(2026, 11, 30))
                .status(FeeStatus.PENDING)
                .paidAt(LocalDateTime.of(2026, 10, 1, 10, 0))
                .transactionRef("TXN-ABCD1234")
                .items(List.of(item))
                .build();

        assertNotNull(fee);
        assertEquals(100L, fee.getId());
        assertEquals(FeeStatus.PENDING, fee.getStatus());
        assertEquals(new BigDecimal("60000"), fee.getTotalAmount());
        assertEquals(new BigDecimal("10000"), fee.getPaidAmount());
        assertEquals(LocalDate.of(2026, 11, 30), fee.getDueDate());
        assertEquals(LocalDateTime.of(2026, 10, 1, 10, 0), fee.getPaidAt());
        assertEquals("TXN-ABCD1234", fee.getTransactionRef());
        assertEquals(1, fee.getItems().size());
        assertEquals("Tuition Fee", fee.getItems().get(0).getDescription());
        assertEquals(FeeCategory.ACADEMIC, fee.getItems().get(0).getCategory());
        assertEquals(new BigDecimal("50000"), fee.getItems().get(0).getAmount());
    }

    @Test
    void feeStatus_enumValues() {
        assertEquals(FeeStatus.PAID, FeeStatus.valueOf("PAID"));
        assertEquals(FeeStatus.PENDING, FeeStatus.valueOf("PENDING"));
        assertEquals(FeeStatus.OVERDUE, FeeStatus.valueOf("OVERDUE"));
    }

    @Test
    void feeCategory_enumValues() {
        assertEquals(FeeCategory.ACADEMIC, FeeCategory.valueOf("ACADEMIC"));
        assertEquals(FeeCategory.HOSTEL, FeeCategory.valueOf("HOSTEL"));
        assertEquals(FeeCategory.MISCELLANEOUS, FeeCategory.valueOf("MISCELLANEOUS"));
    }

    @Test
    void createFeeRequest_gettersSetters() {
        FeeController.CreateFeeRequest req = new FeeController.CreateFeeRequest();
        req.setStudentId(1L);
        req.setSemesterId(2L);
        req.setTotalAmount(new BigDecimal("50000"));
        req.setPaidAmount(new BigDecimal("0"));
        req.setDueDate(LocalDate.of(2026, 12, 31));
        req.setStatus("PENDING");

        assertEquals(1L, req.getStudentId());
        assertEquals(2L, req.getSemesterId());
        assertEquals(new BigDecimal("50000"), req.getTotalAmount());
        assertEquals(new BigDecimal("0"), req.getPaidAmount());
        assertEquals(LocalDate.of(2026, 12, 31), req.getDueDate());
        assertEquals("PENDING", req.getStatus());
    }

    @Test
    void payFeeRequest_gettersSetters() {
        FeeController.PayFeeRequest req = new FeeController.PayFeeRequest();
        req.setPaidAmount(new BigDecimal("50000"));
        req.setPaymentReference("REF-123");
        req.setPaymentMethod("CARD");

        assertEquals(new BigDecimal("50000"), req.getPaidAmount());
        assertEquals("REF-123", req.getPaymentReference());
        assertEquals("CARD", req.getPaymentMethod());
    }

    @Test
    void updateFeeRequest_gettersSetters() {
        FeeController.UpdateFeeRequest req = new FeeController.UpdateFeeRequest();
        req.setTotalAmount(new BigDecimal("70000"));
        req.setPaidAmount(new BigDecimal("30000"));
        req.setDueDate(LocalDate.of(2027, 1, 15));
        req.setStatus("OVERDUE");

        assertEquals(new BigDecimal("70000"), req.getTotalAmount());
        assertEquals(new BigDecimal("30000"), req.getPaidAmount());
        assertEquals(LocalDate.of(2027, 1, 15), req.getDueDate());
        assertEquals("OVERDUE", req.getStatus());
    }
}
