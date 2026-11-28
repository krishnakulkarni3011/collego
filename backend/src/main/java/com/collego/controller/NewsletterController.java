package com.collego.controller;

import com.collego.dto.NewsletterResponse;
import com.collego.service.NewsletterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
@SuppressWarnings("null")
public class NewsletterController {

    private final NewsletterService newsletterService;

    @PostMapping(value = "/api/faculty/hod/newsletters", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<NewsletterResponse> upload(
            Authentication auth,
            @RequestParam("title") String title,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(newsletterService.uploadForHod(auth.getName(), title, file));
    }

    @GetMapping("/api/faculty/newsletters")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<List<NewsletterResponse>> listForFaculty(Authentication auth) {
        return ResponseEntity.ok(newsletterService.listForFaculty(auth.getName()));
    }

    @GetMapping("/api/student/newsletters")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<NewsletterResponse>> listForStudent(Authentication auth) {
        return ResponseEntity.ok(newsletterService.listForStudent(auth.getName()));
    }

    @GetMapping("/api/newsletters/{id}/file")
    public ResponseEntity<byte[]> download(@PathVariable Long id) throws IOException {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(newsletterService.download(id));
    }
}
