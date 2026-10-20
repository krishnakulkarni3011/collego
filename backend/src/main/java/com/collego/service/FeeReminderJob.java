package com.collego.service;

import com.collego.entity.Fee;
import com.collego.entity.Notification;
import com.collego.entity.NotificationType;
import com.collego.repository.FeeRepository;
import com.collego.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Daily fee reminder job. Sends an in-app notification and an email for fees
 * that are due within three days or already overdue. Runs at 09:00 by default
 * (override with collego.fees.reminder-cron).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class FeeReminderJob {

    private final FeeRepository feeRepository;
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    @Scheduled(cron = "${collego.fees.reminder-cron:0 0 9 * * *}")
    @Transactional
    public void sendDueReminders() {
        LocalDate today = LocalDate.now();
        List<Fee> fees = feeRepository.findAll();
        int sent = 0;

        for (Fee fee : fees) {
            BigDecimal total = fee.getTotalAmount() != null ? fee.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal paid = fee.getPaidAmount() != null ? fee.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal balance = total.subtract(paid);

            if (balance.signum() <= 0 || fee.getDueDate() == null) continue;

            boolean dueSoon = !fee.getDueDate().isBefore(today)
                    && !fee.getDueDate().isAfter(today.plusDays(3));
            boolean overdue = fee.getDueDate().isBefore(today);
            if (!dueSoon && !overdue) continue;

            if (fee.getLastReminderAt() != null
                    && fee.getLastReminderAt().isAfter(LocalDateTime.now().minusHours(20))) {
                continue;
            }

            String semester = fee.getSemester() != null ? fee.getSemester().getName() : "your course";
            String title = overdue ? "Fee payment overdue" : "Fee payment due soon";
            String message = "₹" + balance + " is still outstanding for " + semester
                    + ". Due date: " + fee.getDueDate() + ".";

            try {
                notificationRepository.save(Notification.builder()
                        .user(fee.getStudent().getUser())
                        .title(title)
                        .message(message)
                        .type(NotificationType.FEE)
                        .build());

                emailService.send(fee.getStudent().getUser().getEmail(), title,
                        "Hello " + fee.getStudent().getUser().getFirstName() + ",\n\n"
                        + message + "\n\nPlease pay at the accounts office or through the student portal.\n\n"
                        + "— Collego");

                fee.setLastReminderAt(LocalDateTime.now());
                feeRepository.save(fee);
                sent++;
            } catch (Exception ex) {
                log.warn("Failed to send fee reminder for fee {}: {}", fee.getId(), ex.getMessage());
            }
        }

        if (sent > 0) {
            log.info("Sent {} fee reminders", sent);
        }
    }
}
