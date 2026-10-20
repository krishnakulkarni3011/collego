package com.collego.controller;

import com.collego.dto.ChangePasswordRequest;
import com.collego.dto.UpdateProfileRequest;
import com.collego.dto.UserProfileResponse;
import com.collego.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Authenticated self-service endpoints shared by all portals.
 * Mounted under /api/profile so it is never covered by a public /api/auth rule.
 */
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    public ResponseEntity<UserProfileResponse> getProfile(Authentication auth) {
        return ResponseEntity.ok(profileService.getProfile(auth.getName()));
    }

    @PutMapping
    public ResponseEntity<UserProfileResponse> updateProfile(
            Authentication auth,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(profileService.updateProfile(auth.getName(), request));
    }

    @PostMapping("/password")
    public ResponseEntity<Map<String, String>> changePassword(
            Authentication auth,
            @Valid @RequestBody ChangePasswordRequest request) {
        profileService.changePassword(auth.getName(), request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully. Please sign in again."));
    }
}
