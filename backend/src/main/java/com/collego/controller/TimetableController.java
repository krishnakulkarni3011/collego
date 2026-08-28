package com.collego.controller;

import com.collego.dto.CreateTimetableSlotRequest;
import com.collego.dto.TimetableSlotResponse;
import com.collego.service.TimetableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;

    @PostMapping("/api/admin/timetable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TimetableSlotResponse> createSlot(@Valid @RequestBody CreateTimetableSlotRequest request) {
        TimetableSlotResponse response = timetableService.createSlot(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api/timetable/section/{sectionId}")
    public ResponseEntity<List<TimetableSlotResponse>> getSlotsBySection(@PathVariable Long sectionId) {
        return ResponseEntity.ok(timetableService.getSlotsBySection(sectionId));
    }
}
