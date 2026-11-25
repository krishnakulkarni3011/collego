package com.collego.service;

import com.collego.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BroadcastAttachmentServiceTest {

    @Mock private S3StorageService s3StorageService;
    @InjectMocks private BroadcastAttachmentService service;

    @Test
    void rejectsExecutableAttachments() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "malware.exe", "application/octet-stream", new byte[]{1, 2, 3});

        assertThrows(BadRequestException.class, () -> service.store(file));
        verifyNoInteractions(s3StorageService);
    }

    @Test
    void rejectsEmptyAttachments() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "notice.pdf", "application/pdf", new byte[0]);

        assertThrows(BadRequestException.class, () -> service.store(file));
        verifyNoInteractions(s3StorageService);
    }
}
