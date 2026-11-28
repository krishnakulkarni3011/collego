package com.collego.controller;

import com.collego.dto.GraduatedStudentResponse;
import com.collego.service.GraduatedStudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@SuppressWarnings("null")
public class GraduatedStudentController {

    private final GraduatedStudentService graduatedStudentService;

    @GetMapping("/api/admin/graduated-students")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<GraduatedStudentResponse>> listAll() {
        return ResponseEntity.ok(graduatedStudentService.listAll());
    }

    @GetMapping("/api/faculty/hod/graduated-students")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<List<GraduatedStudentResponse>> listForHod(Authentication auth) {
        return ResponseEntity.ok(gradatedStudentService(auth));
    }

    private List<GraduatedStudentResponse> gradatedStudentService(Authentication auth) {
        return graduatedStudentService.listForHod(auth.getName());
    }
}
