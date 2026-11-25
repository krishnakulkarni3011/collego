package com.collego.service;

import com.collego.exception.BadRequestException;
import com.collego.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Stores and serves optional files attached to admin broadcasts. The same
 * object is referenced by every per-recipient notification, so students and
 * faculty can open it from their inbox.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class BroadcastAttachmentService {

    private static final long MAX_FILE_BYTES = 20L * 1024 * 1024; // 20 MB
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "png", "jpg", "jpeg", "gif", "webp",
            "doc", "docx", "xls", "xlsx", "ppt", "pptx",
            "txt", "csv", "zip");

    private final S3StorageService s3StorageService;

    /** Reuse the materials bucket so no extra AWS infrastructure is needed. */
    @Value("${collego.aws.s3-bucket-materials:collego-materials-prod}")
    private String bucket;

    public record StoredAttachment(String fileName, String path, String contentType) {
    }

    public record DownloadedAttachment(byte[] bytes, String fileName, String contentType) {
    }

    public StoredAttachment store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("The selected attachment is empty.");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new BadRequestException("Attachment is too large. The maximum size is 20 MB.");
        }
        String originalName = cleanFileName(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "attachment");
        String extension = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException(
                    "Unsupported attachment type. Upload a PDF, image, Office document, text file or ZIP.");
        }

        String safeName = sanitize(originalName);
        String key = "broadcasts/" + UUID.randomUUID() + "_" + safeName;
        String contentType = S3StorageService.detectContentType(originalName);
        try {
            s3StorageService.upload(bucket, key, file.getInputStream(), file.getSize(), contentType);
        } catch (IOException e) {
            throw new RuntimeException("Could not read the attachment: " + e.getMessage(), e);
        }
        log.info("Stored broadcast attachment s3://{}/{}", bucket, key);
        return new StoredAttachment(originalName, key, contentType);
    }

    public DownloadedAttachment download(String path, String fileName, String contentType) {
        if (path == null || path.isBlank()) {
            throw new ResourceNotFoundException("This message has no attachment.");
        }
        try {
            byte[] bytes = s3StorageService.download(bucket, path);
            return new DownloadedAttachment(
                    bytes,
                    fileName != null && !fileName.isBlank() ? fileName : "attachment",
                    contentType != null && !contentType.isBlank()
                            ? contentType
                            : S3StorageService.detectContentType(fileName));
        } catch (IOException e) {
            throw new RuntimeException("Could not read the attachment: " + e.getMessage(), e);
        }
    }

    private String extensionOf(String name) {
        int dot = name.lastIndexOf('.');
        return dot >= 0 ? name.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
    }

    private String sanitize(String name) {
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    /** Keep only the base file name; strip paths and header-breaking control chars. */
    private String cleanFileName(String name) {
        String cleaned = name.replace('\\', '/');
        int slash = cleaned.lastIndexOf('/');
        if (slash >= 0) cleaned = cleaned.substring(slash + 1);
        cleaned = cleaned.replaceAll("[\\r\\n\\t]", "").trim();
        if (cleaned.length() > 200) {
            // Keep the tail so the extension survives; DB columns are 255-500 chars.
            cleaned = cleaned.substring(cleaned.length() - 200);
        }
        return cleaned.isEmpty() ? "attachment" : cleaned;
    }
}
