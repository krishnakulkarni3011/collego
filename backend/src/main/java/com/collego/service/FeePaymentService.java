package com.collego.service;

import com.collego.dto.FeePaymentResponse;
import com.collego.dto.RecordPaymentRequest;
import com.collego.entity.*;
import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.FeePaymentRepository;
import com.collego.repository.FeeRepository;
import com.collego.repository.NotificationRepository;
import com.collego.repository.StudentProfileRepository;
import com.collego.repository.UserRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Fee payments: online (demo mode), offline recording by admin, installments,
 * receipts and due-date reminders.
 *
 * The online gateway is intentionally pluggable. modes:
 *   disabled (default) - online payment rejected, admin records payments
 *   demo               - simulated successful payment for demos/testing
 *   razorpay           - reserved; requires gateway credentials
 */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class FeePaymentService {

    private final FeeRepository feeRepository;
    private final FeePaymentRepository feePaymentRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    @Value("${collego.payments.mode:disabled}")
    private String paymentMode;

    public Map<String, Object> paymentConfig() {
        boolean online = "demo".equalsIgnoreCase(paymentMode) || "razorpay".equalsIgnoreCase(paymentMode);
        return Map.of(
                "mode", paymentMode.toLowerCase(Locale.ROOT),
                "onlineEnabled", online,
                "gateway", "razorpay".equalsIgnoreCase(paymentMode) ? "razorpay" : "demo",
                "methods", List.of("UPI", "CARD", "NET_BANKING"),
                "message", online
                        ? ("razorpay".equalsIgnoreCase(paymentMode)
                            ? "Online payments are processed by Razorpay."
                            : "Demo payment mode: payments are simulated and marked successful.")
                        : "Online payments are not enabled. Please pay at the accounts office.");
    }

    public List<FeePaymentResponse> listForFee(Long feeId) {
        return feePaymentRepository.findByFeeIdOrderByPaidAtDesc(feeId).stream()
                .map(this::map)
                .collect(Collectors.toList());
    }

    // ==================== Student online payment ====================

    @Transactional
    public FeePaymentResponse payAsStudent(String email, Long feeId, RecordPaymentRequest request) {
        StudentProfile student = studentProfileRepository.findByUserId(
                        userRepository.findByEmailIgnoreCase(email)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email))
                                .getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new ResourceNotFoundException("Fee not found: " + feeId));
        if (!fee.getStudent().getId().equals(student.getId())) {
            throw new AccessDeniedException("This fee does not belong to you.");
        }

        boolean demo = "demo".equalsIgnoreCase(paymentMode);
        boolean razorpay = "razorpay".equalsIgnoreCase(paymentMode);
        if (!demo && !razorpay) {
            throw new BadRequestException("Online payments are not enabled. Please pay at the accounts office.");
        }

        FeePaymentMethod method = parseMethod(request.getMethod());
        if (razorpay) {
            // Razorpay order verification is performed by the gateway callback in a
            // future integration. Until credentials are configured, fail closed.
            throw new BadRequestException("The payment gateway is not configured yet. Please contact the accounts office.");
        }

        return recordPayment(fee, request.getAmount(), method, request.getReference(),
                request.getRemarks(), null);
    }

    // ==================== Admin offline payment ====================

    @Transactional
    public FeePaymentResponse recordOffline(String adminEmail, Long feeId, RecordPaymentRequest request) {
        User admin = userRepository.findByEmailIgnoreCase(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
        if (admin.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only administrators can record payments.");
        }
        Fee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new ResourceNotFoundException("Fee not found: " + feeId));

        FeePaymentMethod method = parseMethod(request.getMethod());
        if (method == FeePaymentMethod.DEMO) {
            throw new BadRequestException("DEMO is not a valid offline payment method.");
        }
        return recordPayment(fee, request.getAmount(), method, request.getReference(),
                request.getRemarks(), admin);
    }

    // ==================== Receipt ====================

    public byte[] receipt(String email, Long paymentId, boolean admin) {
        FeePayment payment = feePaymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + paymentId));

        if (!admin) {
            String ownerEmail = payment.getStudent().getUser().getEmail();
            if (!ownerEmail.equalsIgnoreCase(email)) {
                throw new AccessDeniedException("This receipt does not belong to you.");
            }
        }
        return buildReceiptPdf(payment);
    }

    // ==================== Internals ====================

    private FeePaymentResponse recordPayment(Fee fee, BigDecimal requestedAmount,
                                             FeePaymentMethod method, String reference,
                                             String remarks, User recordedBy) {
        BigDecimal total = fee.getTotalAmount() != null ? fee.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal paid = fee.getPaidAmount() != null ? fee.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal balance = total.subtract(paid);

        if (balance.signum() <= 0) {
            throw new BadRequestException("This fee is already fully paid.");
        }

        BigDecimal amount = requestedAmount != null ? requestedAmount : balance;
        if (amount.signum() <= 0) {
            throw new BadRequestException("Payment amount must be greater than zero.");
        }
        if (amount.compareTo(balance) > 0) {
            throw new BadRequestException("Payment amount exceeds the outstanding balance of ₹" + balance);
        }

        String receiptNumber = generateReceiptNumber();
        FeePayment payment = FeePayment.builder()
                .fee(fee)
                .student(fee.getStudent())
                .amount(amount)
                .method(method)
                .status(FeePaymentStatus.SUCCESS)
                .receiptNumber(receiptNumber)
                .reference(reference != null && !reference.isBlank()
                        ? reference
                        : (method == FeePaymentMethod.DEMO ? "DEMO-" + receiptNumber : receiptNumber))
                .remarks(remarks)
                .paidAt(LocalDateTime.now())
                .recordedBy(recordedBy)
                .build();
        payment = feePaymentRepository.save(payment);

        fee.setPaidAmount(paid.add(amount));
        fee.setTransactionRef(payment.getReference());
        recalculateStatus(fee);
        feeRepository.save(fee);

        notifyPayment(fee, payment);

        log.info("Payment {} of ₹{} recorded for fee {} via {}", receiptNumber, amount, fee.getId(), method);
        return map(payment);
    }

    public void recalculateStatus(Fee fee) {
        BigDecimal total = fee.getTotalAmount() != null ? fee.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal paid = fee.getPaidAmount() != null ? fee.getPaidAmount() : BigDecimal.ZERO;

        if (total.signum() > 0 && paid.compareTo(total) >= 0) {
            fee.setStatus(FeeStatus.PAID);
            if (fee.getPaidAt() == null) fee.setPaidAt(LocalDateTime.now());
        } else if (paid.signum() > 0) {
            // The legacy fees_status_check constraint does not include PARTIAL.
            // A partially paid fee stays PENDING/OVERDUE; the balance is derived
            // from totalAmount - paidAmount.
            fee.setStatus(fee.getDueDate() != null && fee.getDueDate().isBefore(LocalDate.now())
                    ? FeeStatus.OVERDUE : FeeStatus.PENDING);
            fee.setPaidAt(null);
        } else {
            fee.setStatus(fee.getDueDate() != null && fee.getDueDate().isBefore(LocalDate.now())
                    ? FeeStatus.OVERDUE : FeeStatus.PENDING);
            fee.setPaidAt(null);
        }
    }

    private void notifyPayment(Fee fee, FeePayment payment) {
        try {
            User user = fee.getStudent().getUser();
            Notification notification = Notification.builder()
                    .user(user)
                    .title("Payment received")
                    .message("We received ₹" + payment.getAmount() + " for "
                            + (fee.getSemester() != null ? fee.getSemester().getName() : "your fee")
                            + ". Receipt: " + payment.getReceiptNumber())
                    .type(NotificationType.FEE)
                    .build();
            notificationRepository.save(notification);

            emailService.send(user.getEmail(), "Collego payment receipt " + payment.getReceiptNumber(),
                    "Hello " + user.getFirstName() + ",\n\n"
                    + "We received ₹" + payment.getAmount() + " towards "
                    + (fee.getSemester() != null ? fee.getSemester().getName() : "your fee") + ".\n"
                    + "Receipt number: " + payment.getReceiptNumber() + "\n"
                    + "Outstanding balance: ₹" + fee.getTotalAmount().subtract(fee.getPaidAmount()) + "\n\n"
                    + "You can download the receipt from the student portal.");
        } catch (Exception ex) {
            log.warn("Could not create payment notification: {}", ex.getMessage());
        }
    }

    private String generateReceiptNumber() {
        String candidate;
        do {
            candidate = "RCPT-" + LocalDate.now().getYear() + "-"
                    + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        } while (feePaymentRepository.existsByReceiptNumber(candidate));
        return candidate;
    }

    private FeePaymentMethod parseMethod(String raw) {
        if (raw == null) throw new BadRequestException("Payment method is required.");
        try {
            return FeePaymentMethod.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unsupported payment method: " + raw);
        }
    }

    public FeePaymentResponse map(FeePayment payment) {
        return FeePaymentResponse.builder()
                .id(payment.getId())
                .feeId(payment.getFee().getId())
                .semesterName(payment.getFee().getSemester() != null
                        ? payment.getFee().getSemester().getName() : null)
                .amount(payment.getAmount())
                .method(payment.getMethod() != null ? payment.getMethod().name() : null)
                .status(payment.getStatus() != null ? payment.getStatus().name() : null)
                .receiptNumber(payment.getReceiptNumber())
                .reference(payment.getReference())
                .remarks(payment.getRemarks())
                .paidAt(payment.getPaidAt())
                .recordedByAdmin(payment.getRecordedBy() != null)
                .build();
    }

    // ==================== PDF receipt ====================

    private byte[] buildReceiptPdf(FeePayment payment) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 48, 48, 48, 48);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD, new Color(49, 46, 129));
            Font subFont = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(100, 116, 139));
            Font labelFont = new Font(Font.HELVETICA, 9, Font.BOLD, new Color(71, 85, 105));

            Paragraph title = new Paragraph("COLLEGO", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subtitle = new Paragraph("Department of Computer Science & Engineering", subFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            document.add(subtitle);

            Paragraph receiptTitle = new Paragraph("FEE PAYMENT RECEIPT", new Font(Font.HELVETICA, 13, Font.BOLD));
            receiptTitle.setAlignment(Element.ALIGN_CENTER);
            receiptTitle.setSpacingBefore(18);
            receiptTitle.setSpacingAfter(12);
            document.add(receiptTitle);

            User student = payment.getStudent().getUser();
            PdfPTable meta = new PdfPTable(2);
            meta.setWidthPercentage(100);
            meta.setWidths(new float[]{1, 2});
            addRow(meta, "Receipt No.", payment.getReceiptNumber(), labelFont);
            addRow(meta, "Date", payment.getPaidAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm")), labelFont);
            addRow(meta, "Student", student.getFirstName() + " " + student.getLastName(), labelFont);
            addRow(meta, "USN", payment.getStudent().getEnrollmentNumber() != null
                    ? payment.getStudent().getEnrollmentNumber() : "-", labelFont);
            addRow(meta, "Semester", payment.getFee().getSemester() != null
                    ? payment.getFee().getSemester().getName() : "-", labelFont);
            addRow(meta, "Payment method", payment.getMethod().name(), labelFont);
            addRow(meta, "Reference", payment.getReference() != null ? payment.getReference() : "-", labelFont);
            document.add(meta);

            PdfPTable amounts = new PdfPTable(2);
            amounts.setWidthPercentage(100);
            amounts.setSpacingBefore(16);
            addAmountRow(amounts, "Amount paid", "₹ " + payment.getAmount(), true);
            addAmountRow(amounts, "Total fee", "₹ " + payment.getFee().getTotalAmount(), false);
            addAmountRow(amounts, "Total paid", "₹ " + payment.getFee().getPaidAmount(), false);
            addAmountRow(amounts, "Balance", "₹ " + payment.getFee().getTotalAmount()
                    .subtract(payment.getFee().getPaidAmount()), false);
            document.add(amounts);

            Paragraph footer = new Paragraph(
                    "This is a computer-generated receipt. " + (payment.getRecordedBy() != null
                            ? "Recorded by the accounts office." : "Paid online."),
                    subFont);
            footer.setSpacingBefore(24);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (DocumentException ex) {
            throw new RuntimeException("Could not generate receipt", ex);
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    private void addRow(PdfPTable table, String label, String value, Font labelFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPaddingBottom(6);
        PdfPCell valueCell = new PdfPCell(new Phrase(value != null ? value : "-",
                new Font(Font.HELVETICA, 10)));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPaddingBottom(6);
        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addAmountRow(PdfPTable table, String label, String value, boolean highlight) {
        Font font = new Font(Font.HELVETICA, highlight ? 11 : 10, highlight ? Font.BOLD : Font.NORMAL);
        PdfPCell labelCell = new PdfPCell(new Phrase(label, font));
        PdfPCell valueCell = new PdfPCell(new Phrase(value, font));
        labelCell.setPadding(8);
        valueCell.setPadding(8);
        labelCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        if (highlight) {
            labelCell.setBackgroundColor(new Color(238, 242, 255));
            valueCell.setBackgroundColor(new Color(238, 242, 255));
        }
        table.addCell(labelCell);
        table.addCell(valueCell);
    }
}
