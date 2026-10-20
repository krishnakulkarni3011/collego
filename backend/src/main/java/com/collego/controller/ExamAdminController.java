package com.collego.controller;

import com.collego.dto.*;
import com.collego.service.ExamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/exams")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class ExamAdminController {

    private final ExamService examService;

    @GetMapping
    public ResponseEntity<List<ExamResponse>> listExams() {
        return ResponseEntity.ok(examService.listExams());
    }

    @PostMapping
    public ResponseEntity<ExamResponse> createExam(@Valid @RequestBody CreateExamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examService.createExam(request));
    }

    @PutMapping("/{examId}/status")
    public ResponseEntity<ExamResponse> updateStatus(
            @PathVariable Long examId,
            @RequestParam String status) {
        return ResponseEntity.ok(examService.updateExamStatus(examId, status));
    }

    @DeleteMapping("/{examId}")
    public ResponseEntity<Map<String, String>> deleteExam(@PathVariable Long examId) {
        examService.deleteExam(examId);
        return ResponseEntity.ok(Map.of("message", "Exam deleted"));
    }

    @GetMapping("/{examId}/schedules")
    public ResponseEntity<List<ExamScheduleResponse>> listSchedules(@PathVariable Long examId) {
        return ResponseEntity.ok(examService.listSchedules(examId));
    }

    @PostMapping("/schedules")
    public ResponseEntity<ExamScheduleResponse> createSchedule(
            @Valid @RequestBody CreateExamScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examService.createSchedule(request));
    }

    @DeleteMapping("/schedules/{scheduleId}")
    public ResponseEntity<Map<String, String>> deleteSchedule(@PathVariable Long scheduleId) {
        examService.deleteSchedule(scheduleId);
        return ResponseEntity.ok(Map.of("message", "Schedule deleted"));
    }

    @PutMapping("/schedules/{scheduleId}/invigilator")
    public ResponseEntity<ExamScheduleResponse> assignInvigilator(
            @PathVariable Long scheduleId,
            @RequestParam(required = false) Long facultyId) {
        return ResponseEntity.ok(examService.assignInvigilator(scheduleId, facultyId));
    }

    @GetMapping("/invigilators")
    public ResponseEntity<List<Map<String, Object>>> invigilators() {
        return ResponseEntity.ok(examService.listInvigilators());
    }

    @GetMapping("/{examId}/seating")
    public ResponseEntity<List<SeatingRowResponse>> seating(@PathVariable Long examId) {
        return ResponseEntity.ok(examService.seating(examId));
    }

    @GetMapping("/revaluations")
    public ResponseEntity<List<RevaluationResponse>> revaluations() {
        return ResponseEntity.ok(examService.allRevaluations());
    }

    @PutMapping("/revaluations/{id}")
    public ResponseEntity<RevaluationResponse> resolveRevaluation(
            @PathVariable Long id,
            @Valid @RequestBody ResolveRevaluationRequest request) {
        return ResponseEntity.ok(examService.resolveRevaluation(id, request));
    }

    @GetMapping("/promotion/preview")
    public ResponseEntity<Map<String, Object>> promotionPreview(
            @RequestParam Long fromSemesterId,
            @RequestParam Long toSemesterId) {
        return ResponseEntity.ok(examService.previewPromotion(fromSemesterId, toSemesterId));
    }

    @PostMapping("/promotion")
    public ResponseEntity<Map<String, Object>> promote(
            @RequestParam Long fromSemesterId,
            @RequestParam Long toSemesterId) {
        return ResponseEntity.ok(examService.promoteStudents(fromSemesterId, toSemesterId));
    }
}
