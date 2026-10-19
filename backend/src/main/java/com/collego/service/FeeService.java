package com.collego.service;

import com.collego.controller.FeeController;
import com.collego.dto.FeeItemResponse;
import com.collego.dto.FeeResponse;
import com.collego.entity.*;
import com.collego.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeeService {

    private final FeeRepository feeRepository;
    private final FeeItemRepository feeItemRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SemesterRepository semesterRepository;
    private final UserRepository userRepository;

    /**
     * Create a new fee record for a student with line items.
     */
    @Transactional
    public FeeResponse createFee(String adminEmail, FeeController.CreateFeeRequest request) {
        // Verify admin
        User admin = userRepository.findByEmailIgnoreCase(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found: " + adminEmail));
        if (admin.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Only admins can create fees");
        }

        StudentProfile student = studentProfileRepository.findById(request.getStudentId())
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + request.getStudentId()));
        Semester semester = semesterRepository.findById(request.getSemesterId())
                .orElseThrow(() -> new IllegalArgumentException("Semester not found: " + request.getSemesterId()));

        BigDecimal totalAmount = request.getTotalAmount() != null ? request.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal paidAmount = request.getPaidAmount() != null ? request.getPaidAmount() : BigDecimal.ZERO;
        FeeStatus status = request.getStatus() != null
                ? FeeStatus.valueOf(request.getStatus())
                : (paidAmount.compareTo(totalAmount) >= 0 ? FeeStatus.PAID : FeeStatus.PENDING);

        Fee fee = Fee.builder()
                .student(student)
                .semester(semester)
                .totalAmount(totalAmount)
                .paidAmount(paidAmount)
                .dueDate(request.getDueDate())
                .status(status)
                .paidAt(paidAmount.compareTo(totalAmount) >= 0 ? LocalDateTime.now() : null)
                .transactionRef("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .build();
        fee = feeRepository.save(fee);

        // Add line items
        if (request.getItems() != null) {
            for (FeeController.CreateFeeItemRequest itemReq : request.getItems()) {
                FeeItem item = FeeItem.builder()
                        .fee(fee)
                        .category(FeeCategory.valueOf(itemReq.getCategory()))
                        .description(itemReq.getDescription())
                        .amount(itemReq.getAmount())
                        .build();
                feeItemRepository.save(item);
            }
        }

        return mapToResponse(fee);
    }

    /**
     * List fees with optional filters.
     */
    @Transactional(readOnly = true)
    public List<FeeResponse> listFees(Long studentId, Long semesterId, String status) {
        List<Fee> fees;
        if (studentId != null && semesterId != null) {
            fees = feeRepository.findByStudentIdAndSemesterId(studentId, semesterId);
        } else if (studentId != null) {
            fees = feeRepository.findByStudentId(studentId);
        } else {
            fees = feeRepository.findAll();
        }

        if (status != null) {
            FeeStatus feeStatus = FeeStatus.valueOf(status);
            fees = fees.stream()
                    .filter(f -> f.getStatus() == feeStatus)
                    .collect(Collectors.toList());
        }

        return fees.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a single fee by ID with line items.
     */
    @Transactional(readOnly = true)
    public FeeResponse getFee(Long feeId) {
        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new IllegalArgumentException("Fee not found: " + feeId));
        return mapToResponse(fee);
    }

    /**
     * Update fee details.
     */
    @Transactional
    public FeeResponse updateFee(Long feeId, FeeController.UpdateFeeRequest request) {
        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new IllegalArgumentException("Fee not found: " + feeId));

        if (request.getTotalAmount() != null) {
            fee.setTotalAmount(request.getTotalAmount());
        }
        if (request.getPaidAmount() != null) {
            fee.setPaidAmount(request.getPaidAmount());
        }
        if (request.getDueDate() != null) {
            fee.setDueDate(request.getDueDate());
        }
        if (request.getStatus() != null) {
            fee.setStatus(FeeStatus.valueOf(request.getStatus()));
        }

        // Auto-set paidAt when marked PAID
        if (fee.getStatus() == FeeStatus.PAID && fee.getPaidAt() == null) {
            fee.setPaidAt(LocalDateTime.now());
        } else if (fee.getStatus() != FeeStatus.PAID) {
            fee.setPaidAt(null);
        }

        fee = feeRepository.save(fee);
        return mapToResponse(fee);
    }

    /**
     * Mark a fee as paid (record payment).
     */
    @Transactional
    public FeeResponse markFeePaid(String adminEmail, Long feeId, FeeController.PayFeeRequest request) {
        // Verify admin
        User admin = userRepository.findByEmailIgnoreCase(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found: " + adminEmail));
        if (admin.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Only admins can mark fees as paid");
        }

        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new IllegalArgumentException("Fee not found: " + feeId));

        BigDecimal paidAmount = request.getPaidAmount() != null ? request.getPaidAmount() : fee.getTotalAmount();
        fee.setPaidAmount(paidAmount);
        fee.setStatus(paidAmount.compareTo(fee.getTotalAmount()) >= 0 ? FeeStatus.PAID : FeeStatus.PENDING);
        fee.setPaidAt(LocalDateTime.now());
        fee.setTransactionRef(request.getPaymentReference() != null ? request.getPaymentReference()
                : "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

        fee = feeRepository.save(fee);
        return mapToResponse(fee);
    }

    /**
     * Add a line item to a fee.
     */
    @Transactional
    public FeeItemResponse addFeeItem(Long feeId, FeeController.CreateFeeItemRequest request) {
        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new IllegalArgumentException("Fee not found: " + feeId));

        FeeItem item = FeeItem.builder()
                .fee(fee)
                .category(FeeCategory.valueOf(request.getCategory()))
                .description(request.getDescription())
                .amount(request.getAmount())
                .build();
        item = feeItemRepository.save(item);

        // Recalculate total from items
        BigDecimal total = feeItemRepository.findByFeeId(feeId).stream()
                .map(FeeItem::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        fee.setTotalAmount(total);
        if (fee.getPaidAmount().compareTo(total) >= 0) {
            fee.setStatus(FeeStatus.PAID);
            fee.setPaidAt(LocalDateTime.now());
        }
        feeRepository.save(fee);

        return mapToItemResponse(item);
    }

    // ─── Mappers ──────────────────────────────────────────────────────────────

    private FeeResponse mapToResponse(Fee fee) {
        FeeResponse response = new FeeResponse();
        response.setId(fee.getId());
        response.setSemesterId(fee.getSemester() != null ? fee.getSemester().getId() : null);
        response.setSemesterName(fee.getSemester() != null ? fee.getSemester().getName() : null);
        response.setTotalAmount(fee.getTotalAmount());
        response.setPaidAmount(fee.getPaidAmount());
        response.setDueDate(fee.getDueDate());
        response.setStatus(fee.getStatus() != null ? fee.getStatus().name() : null);
        response.setPaidAt(fee.getPaidAt());
        response.setTransactionRef(fee.getTransactionRef());
        if (fee.getItems() != null) {
            response.setItems(fee.getItems().stream()
                    .map(this::mapToItemResponse)
                    .collect(Collectors.toList()));
        }
        return response;
    }

    private FeeItemResponse mapToItemResponse(FeeItem item) {
        FeeItemResponse response = new FeeItemResponse();
        response.setCategory(item.getCategory() != null ? item.getCategory().name() : null);
        response.setDescription(item.getDescription());
        response.setAmount(item.getAmount());
        return response;
    }
}
