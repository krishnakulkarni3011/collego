package com.collego.service;

import com.collego.entity.AuditLog;
import com.collego.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public void log(Long userId, String userEmail, String action,
                    String entityType, Long entityId, String details, String ipAddress) {
        AuditLog auditLog = AuditLog.builder()
                .userId(userId)
                .userEmail(userEmail)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .ipAddress(ipAddress)
                .build();

        auditLogRepository.save(auditLog);
        log.info("AUDIT: user={} action={} entity={}:{} details={}",
                userEmail, action, entityType, entityId, details);
    }

    public void log(Long userId, String userEmail, String action, String details, String ipAddress) {
        log(userId, userEmail, action, null, null, details, ipAddress);
    }
}
