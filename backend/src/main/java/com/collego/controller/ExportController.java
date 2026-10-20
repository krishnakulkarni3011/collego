package com.collego.controller;

import com.collego.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/export")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;

    @GetMapping("/students")
    public ResponseEntity<byte[]> exportStudents() {
        return csv(exportService.studentsCsv(), "students-" + LocalDate.now() + ".csv");
    }

    @GetMapping("/faculty")
    public ResponseEntity<byte[]> exportFaculty() {
        return csv(exportService.facultyCsv(), "faculty-" + LocalDate.now() + ".csv");
    }

    private ResponseEntity<byte[]> csv(byte[] data, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(data);
    }
}
