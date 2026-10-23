package com.collego.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * The notification {@code category} column was added for per-tab unread badges.
 * Rows created before the upgrade have no category; they are all notices.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(2)
public class NotificationCategoryBackfill implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            int updated = jdbcTemplate.update(
                    "UPDATE notifications SET category = 'NOTICE' WHERE category IS NULL");
            if (updated > 0) {
                log.info("Backfilled {} notification(s) with the NOTICE category.", updated);
            }
        } catch (Exception ex) {
            // The column may not exist yet on a brand-new schema; Hibernate creates it.
            log.debug("Notification category backfill skipped: {}", ex.getMessage());
        }
    }
}
