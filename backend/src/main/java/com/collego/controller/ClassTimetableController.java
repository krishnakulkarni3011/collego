package com.collego.controller;

import com.collego.dto.ClassTimetableResponse;
import com.collego.service.ClassTimetableService;
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

/**
 * Class timetables uploaded by the Head of Department and viewed by students.
 *
 * Students only ever use endpoints without an id, so their own JWT identity
 * decides which PDF is returned.
 */
@RestController
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ClassTimetableController {

    private final ClassTimetableService classTimetableService;

    // ==================== HoD ====================

    @GetMapping("/api/faculty/hod/timetables")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<List<ClassTimetableResponse>> listForHod(Authentication auth) {
        return ResponseEntity.ok(classTimetableService.listForHod(auth.getName()));
    }

    @PostMapping(value = "/api/faculty/hod/timetables", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<ClassTimetableResponse> uploadForHod(
            Authentication auth,
            @RequestParam("year") Integer year,
            @RequestParam("section") String section,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(classTimetableService.uploadForHod(auth.getName(), year, section, file));
    }

    @DeleteMapping("/api/faculty/hod/timetables/{id}")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<Void> deleteForHod(Authentication auth, @PathVariable Long id) {
        classTimetableService.deleteForHod(auth.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/faculty/hod/timetables/{id}/file")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<byte[]> downloadForHod(
            Authentication auth,
            @PathVariable Long id,
            @RequestParam(value = "download", defaultValue = "false") boolean download) throws IOException {
        byte[] data = classTimetableService.downloadForHod(auth.getName(), id);
        return pdfResponse(data, "class-timetable.pdf", download);
    }

    // ==================== Student ====================

    @GetMapping("/api/student/timetable/class/file")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<byte[]> downloadOwnClassTimetable(
            Authentication auth,
            @RequestParam(value = "download", defaultValue = "false") boolean download) throws IOException {
        byte[] data = classTimetableService.downloadForStudent(auth.getName());
        return pdfResponse(data, "class-timetable.pdf", download);
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] data, String fileName, boolean download) {
        String disposition = (download ? "attachment" : "inline") + "; filename=\"" + fileName + "\"";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }
}
