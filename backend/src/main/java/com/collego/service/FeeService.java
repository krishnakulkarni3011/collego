package com.collego.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FeeService {

    // Fee creation is handled by the data seeder and admin endpoints (Phase 5).
    // This service currently only provides query support via StudentPortalService.
    // Admin fee CRUD will be added in Phase 5.
}
