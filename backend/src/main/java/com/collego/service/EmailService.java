package com.collego.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Thin email abstraction. When SMTP is not configured (collego.mail.enabled=false
 * or spring.mail.host missing) messages are logged instead of sent, so the rest
 * of the application keeps working in local development.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${collego.mail.enabled:false}")
    private boolean enabled;

    @Value("${collego.mail.from:no-reply@collego.local}")
    private String from;

    @Value("${collego.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public boolean isEnabled() {
        return enabled && mailSenderProvider.getIfAvailable() != null;
    }

    public String frontendUrl() {
        return frontendUrl;
    }

    /** Send a plain-text email. Never throws: delivery failures are logged. */
    public void send(String to, String subject, String body) {
        if (!isEnabled()) {
            log.info("[mail disabled] to={} subject={} body={}", to, subject, body);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSenderProvider.getObject().send(message);
            log.info("Email sent to {} ({})", to, subject);
        } catch (Exception ex) {
            log.warn("Failed to send email to {}: {}", to, ex.getMessage());
        }
    }
}
