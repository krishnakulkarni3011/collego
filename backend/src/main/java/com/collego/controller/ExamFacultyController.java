package com.collego.controller;

import com.collego.dto.ExamScheduleResponse;
import com.collego.service.ExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/faculty/invigilations")
@PreAuthorize("hasRole('FACULTY')")
@RequiredArgsConstructor
public class ExamFacultyController {

    private final ExamService examService;

    @GetMapping
    public ResponseEntity<List<ExamScheduleResponse>> myInvigilations(Authentication auth) {
        return ResponseEntity.ok(examService.myInvigilations(auth.getName()));
    }
}
