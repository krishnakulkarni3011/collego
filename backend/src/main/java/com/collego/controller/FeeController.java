package com.collego.controller;

import com.collego.dto.FeeItemResponse;
import com.collego.dto.FeeResponse;
import com.collego.service.FeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/fees")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class FeeController {

    private final FeeService feeService;

    /**
     * Create a new fee record for a student (with line items).
     */
    @PostMapping
    public ResponseEntity<FeeResponse> createFee(
            Authentication auth,
            @RequestBody CreateFeeRequest request) {
        FeeResponse response = feeService.createFee(auth.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * List all fees (optionally filtered by student, semester, status).
     */
    @GetMapping
    public ResponseEntity<List<FeeResponse>> listFees(
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Long semesterId,
            @RequestParam(required = false) String status) {
        List<FeeResponse> fees = feeService.listFees(studentId, semesterId, status);
        return ResponseEntity.ok(fees);
    }

    /**
     * Get a single fee by ID with its line items.
     */
    @GetMapping("/{feeId}")
    public ResponseEntity<FeeResponse> getFee(@PathVariable Long feeId) {
        FeeResponse fee = feeService.getFee(feeId);
        return ResponseEntity.ok(fee);
    }

    /**
     * Update fee details (due date, status, paid amount).
     */
    @PutMapping("/{feeId}")
    public ResponseEntity<FeeResponse> updateFee(
            @PathVariable Long feeId,
            @RequestBody UpdateFeeRequest request) {
        FeeResponse response = feeService.updateFee(feeId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Mark a fee as paid (records payment).
     */
    @PostMapping("/{feeId}/pay")
    public ResponseEntity<FeeResponse> markFeePaid(
            Authentication auth,
            @PathVariable Long feeId,
            @RequestBody PayFeeRequest request) {
        FeeResponse response = feeService.markFeePaid(auth.getName(), feeId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Add a line item to a fee.
     */
    @PostMapping("/{feeId}/items")
    public ResponseEntity<FeeItemResponse> addFeeItem(
            @PathVariable Long feeId,
            @RequestBody CreateFeeItemRequest request) {
        FeeItemResponse item = feeService.addFeeItem(feeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(item);
    }

    // ─── Request DTOs ─────────────────────────────────────────────────────────

    public static class CreateFeeRequest {
        private Long studentId;
        private Long semesterId;
        private java.math.BigDecimal totalAmount;
        private java.math.BigDecimal paidAmount;
        private java.time.LocalDate dueDate;
        private String status;
        private List<CreateFeeItemRequest> items;
        // getters/setters (Lombok-free, simple)
        public Long getStudentId() { return studentId; }
        public void setStudentId(Long studentId) { this.studentId = studentId; }
        public Long getSemesterId() { return semesterId; }
        public void setSemesterId(Long semesterId) { this.semesterId = semesterId; }
        public java.math.BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(java.math.BigDecimal totalAmount) { this.totalAmount = totalAmount; }
        public java.math.BigDecimal getPaidAmount() { return paidAmount; }
        public void setPaidAmount(java.math.BigDecimal paidAmount) { this.paidAmount = paidAmount; }
        public java.time.LocalDate getDueDate() { return dueDate; }
        public void setDueDate(java.time.LocalDate dueDate) { this.dueDate = dueDate; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public List<CreateFeeItemRequest> getItems() { return items; }
        public void setItems(List<CreateFeeItemRequest> items) { this.items = items; }
    }

    public static class CreateFeeItemRequest {
        private String category;
        private String description;
        private java.math.BigDecimal amount;
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public java.math.BigDecimal getAmount() { return amount; }
        public void setAmount(java.math.BigDecimal amount) { this.amount = amount; }
    }

    public static class UpdateFeeRequest {
        private java.math.BigDecimal totalAmount;
        private java.math.BigDecimal paidAmount;
        private java.time.LocalDate dueDate;
        private String status;
        public java.math.BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(java.math.BigDecimal totalAmount) { this.totalAmount = totalAmount; }
        public java.math.BigDecimal getPaidAmount() { return paidAmount; }
        public void setPaidAmount(java.math.BigDecimal paidAmount) { this.paidAmount = paidAmount; }
        public java.time.LocalDate getDueDate() { return dueDate; }
        public void setDueDate(java.time.LocalDate dueDate) { this.dueDate = dueDate; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    public static class PayFeeRequest {
        private java.math.BigDecimal paidAmount;
        private String paymentReference;
        private String paymentMethod;
        public java.math.BigDecimal getPaidAmount() { return paidAmount; }
        public void setPaidAmount(java.math.BigDecimal paidAmount) { this.paidAmount = paidAmount; }
        public String getPaymentReference() { return paymentReference; }
        public void setPaymentReference(String paymentReference) { this.paymentReference = paymentReference; }
        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    }
}
