package com.collego.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.io.InputStream;

/**
 * Phase 8 — Central S3 storage abstraction.
 *
 * All services (QuestionPaperService, PlacementService, FacultyPortalService,
 * MarksheetService) delegate file I/O here instead of using java.nio.file directly.
 *
 * When collego.aws.use-s3=false (local dev, default), methods use a no-op fallback
 * that logs a warning. In prod (SPRING_PROFILES_ACTIVE=prod, USE_S3=true) all calls
 * go to real S3.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class S3StorageService {

    private final S3Client s3Client;

    @Value("${collego.aws.use-s3:false}")
    private boolean useS3;

    // ==================== Upload ====================

    /**
     * Upload a file to S3.
     *
     * @param bucket        S3 bucket name (e.g. "collego-question-papers-prod")
     * @param key           S3 object key (e.g. "1/3/5/uuid_filename.pdf")
     * @param inputStream   File bytes
     * @param contentLength Byte count (required by S3 SDK for streaming)
     * @param contentType   MIME type (e.g. "application/pdf")
     */
    public void upload(String bucket, String key, InputStream inputStream,
                       long contentLength, String contentType) {
        if (!useS3) {
            log.warn("[S3 STUB] upload skipped (use-s3=false): s3://{}/{}", bucket, key);
            return;
        }
        try {
            PutObjectRequest req = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .contentLength(contentLength)
                    .build();
            s3Client.putObject(req, RequestBody.fromInputStream(inputStream, contentLength));
            log.info("Uploaded to s3://{}/{}", bucket, key);
        } catch (S3Exception e) {
            log.error("S3 upload failed for s3://{}/{}: {}", bucket, key, e.getMessage());
            throw new RuntimeException("File upload to S3 failed: " + e.getMessage(), e);
        }
    }

    // ==================== Download ====================

    /**
     * Download file bytes from S3.
     *
     * @param bucket S3 bucket name
     * @param key    S3 object key
     * @return raw bytes of the file
     */
    public byte[] download(String bucket, String key) throws IOException {
        if (!useS3) {
            log.warn("[S3 STUB] download skipped (use-s3=false): s3://{}/{}", bucket, key);
            throw new RuntimeException("S3 storage not configured for local dev. " +
                    "File not available without USE_S3=true and a real S3 bucket.");
        }
        try {
            GetObjectRequest req = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();
            try (ResponseInputStream<GetObjectResponse> resp = s3Client.getObject(req)) {
                byte[] bytes = resp.readAllBytes();
                log.info("Downloaded {} bytes from s3://{}/{}", bytes.length, bucket, key);
                return bytes;
            }
        } catch (NoSuchKeyException e) {
            throw new RuntimeException("File not found in S3: s3://" + bucket + "/" + key, e);
        } catch (S3Exception e) {
            log.error("S3 download failed for s3://{}/{}: {}", bucket, key, e.getMessage());
            throw new RuntimeException("File download from S3 failed: " + e.getMessage(), e);
        }
    }

    // ==================== Delete ====================

    /**
     * Delete an object from S3 (e.g. when replacing an existing file).
     *
     * @param bucket S3 bucket name
     * @param key    S3 object key
     */
    public void delete(String bucket, String key) {
        if (!useS3) {
            log.warn("[S3 STUB] delete skipped (use-s3=false): s3://{}/{}", bucket, key);
            return;
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket).key(key).build());
            log.info("Deleted s3://{}/{}", bucket, key);
        } catch (S3Exception e) {
            log.warn("S3 delete failed for s3://{}/{}: {}", bucket, key, e.getMessage());
        }
    }

    // ==================== Existence Check ====================

    /**
     * Check whether an object exists in S3.
     *
     * @param bucket S3 bucket name
     * @param key    S3 object key
     * @return true if the object exists
     */
    public boolean exists(String bucket, String key) {
        if (!useS3) {
            return false;
        }
        try {
            s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucket).key(key).build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (S3Exception e) {
            log.warn("S3 exists check failed for s3://{}/{}: {}", bucket, key, e.getMessage());
            return false;
        }
    }

    // ==================== Helper ====================

    /**
     * Detect a reasonable content-type based on file extension.
     */
    public static String detectContentType(String filename) {
        if (filename == null) return "application/octet-stream";
        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf"))  return "application/pdf";
        if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (lower.endsWith(".doc"))  return "application/msword";
        if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "application/vnd.ms-powerpoint";
        if (lower.endsWith(".zip")) return "application/zip";
        return "application/octet-stream";
    }
}
