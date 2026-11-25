package com.collego.controller;

import com.collego.entity.Notification;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.NotificationRepository;
import com.collego.service.BroadcastAttachmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * Serves the file attached to a broadcast notification. The notification id is
 * checked against the signed-in user, so a student can only open files sent to
 * them, never another student's notification.
 */
@RestController
@RequiredArgsConstructor
@SuppressWarnings("null")
public class NotificationAttachmentController {

    private final NotificationRepository notificationRepository;
    private final BroadcastAttachmentService broadcastAttachmentService;

    @GetMapping("/api/notifications/{id}/attachment")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> viewAttachment(
            Authentication auth,
            @PathVariable Long id,
            @RequestParam(value = "download", defaultValue = "false") boolean download) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id));

        String owner = notification.getUser() != null ? notification.getUser().getEmail() : null;
        if (owner == null || !owner.equalsIgnoreCase(auth.getName())) {
            throw new AccessDeniedException("You can only open attachments sent to you.");
        }

        BroadcastAttachmentService.DownloadedAttachment attachment = broadcastAttachmentService.download(
                notification.getAttachmentPath(),
                notification.getAttachmentFileName(),
                notification.getAttachmentContentType());

        return fileResponse(attachment, download);
    }

    static ResponseEntity<byte[]> fileResponse(
            BroadcastAttachmentService.DownloadedAttachment attachment, boolean download) {
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(attachment.contentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }
        String safeName = attachment.fileName() == null
                ? "attachment"
                : attachment.fileName().replaceAll("[\\r\\n\"]", "");
        String disposition = (download ? "attachment" : "inline") + "; filename=\"" + safeName + "\"";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header("X-Content-Type-Options", "nosniff")
                .contentType(mediaType)
                .body(attachment.bytes());
    }
}
