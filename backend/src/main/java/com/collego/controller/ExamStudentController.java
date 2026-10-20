package com.collego.controller;

import com.collego.dto.*;
import com.collego.service.ExamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/student/exams")
@PreAuthorize("hasRole('STUDENT')")
@RequiredArgsConstructor
public class ExamStudentController {

    private final ExamService examService;

    @GetMapping
    public ResponseEntity<List<ExamResponse>> myExams(Authentication auth) {
        return ResponseEntity.ok(examService.studentExams(auth.getName()));
    }

    @GetMapping("/{examId}/schedule")
    public ResponseEntity<List<ExamScheduleResponse>> mySchedule(
            Authentication auth,
            @PathVariable Long examId) {
        return ResponseEntity.ok(examService.studentSchedule(auth.getName(), examId));
    }

    @GetMapping("/{examId}/hall-ticket")
    public ResponseEntity<byte[]> hallTicket(
            Authentication auth,
            @PathVariable Long examId) {
        byte[] pdf = examService.hallTicket(auth.getName(), examId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=hall-ticket-" + examId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/revaluations")
    public ResponseEntity<List<RevaluationResponse>> myRevaluations(Authentication auth) {
        return ResponseEntity.ok(examService.myRevaluations(auth.getName()));
    }

    @GetMapping("/courses")
    public ResponseEntity<List<java.util.Map<String, Object>>> coursesTaken(Authentication auth) {
        return ResponseEntity.ok(examService.coursesTaken(auth.getName()));
    }

    @PostMapping("/revaluations")
    public ResponseEntity<RevaluationResponse> requestRevaluation(
            Authentication auth,
            @Valid @RequestBody CreateRevaluationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(examService.requestRevaluation(auth.getName(), request));
    }
}
