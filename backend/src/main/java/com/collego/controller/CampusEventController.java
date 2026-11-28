package com.collego.controller;

import com.collego.dto.CampusEventResponse;
import com.collego.service.CampusEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
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
public class CampusEventController {

    private final CampusEventService eventService;

    @PostMapping(value = "/api/admin/events", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CampusEventResponse> publish(
            Authentication auth,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "eventDate", required = false) String eventDate,
            @RequestParam("poster") MultipartFile poster) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.publish(auth.getName(), title, description, eventDate, poster));
    }

    @GetMapping("/api/admin/events")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CampusEventResponse>> listAll() {
        return ResponseEntity.ok(eventService.listAll());
    }

    @DeleteMapping("/api/admin/events/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        eventService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/events/upcoming")
    public ResponseEntity<List<CampusEventResponse>> upcoming() {
        return ResponseEntity.ok(eventService.listUpcoming());
    }

    @GetMapping("/api/events/{id}/poster")
    public ResponseEntity<byte[]> poster(@PathVariable Long id) throws IOException {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(eventService.downloadPoster(id));
    }
}
