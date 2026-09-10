package com.journal.app.controller;

import com.journal.app.dto.TargetKeyResponse;
import com.journal.app.dto.TargetRequest;
import com.journal.app.dto.TargetResponse;
import com.journal.app.service.TargetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Handles all /api/targets routes.
 *
 * Endpoint map (replaces the Next.js target routes, fixing the DELETE-as-list-hack):
 *   GET  /api/targets?type=&key=       → get one target
 *   PUT  /api/targets?type=&key=       → upsert one target
 *   GET  /api/targets/list?type=       → list all keys for a type (semester names, etc.)
 */
@RestController
@RequestMapping("/api/targets")
public class TargetController {

    private final TargetService targetService;

    public TargetController(TargetService targetService) {
        this.targetService = targetService;
    }

    /**
     * GET /api/targets?type=monthly&key=2026-07
     * Returns the target for the given (type, key), or an empty response if it doesn't exist.
     */
    @GetMapping
    public ResponseEntity<TargetResponse> get(
            @RequestParam String type,
            @RequestParam String key) {

        if (type == null || type.isBlank() || key == null || key.isBlank()) {
            throw new IllegalArgumentException("Missing required query params: type and key");
        }
        return ResponseEntity.ok(targetService.get(type, key));
    }

    /**
     * PUT /api/targets?type=monthly&key=2026-07
     * Create or update the target for the given (type, key).
     */
    @PutMapping
    public ResponseEntity<TargetResponse> upsert(
            @RequestParam String type,
            @RequestParam String key,
            @RequestBody TargetRequest request) {

        if (type == null || type.isBlank() || key == null || key.isBlank()) {
            throw new IllegalArgumentException("Missing required query params: type and key");
        }
        return ResponseEntity.ok(targetService.upsert(type, key, request));
    }

    /**
     * GET /api/targets/list?type=semester
     * Returns all keys (e.g., semester names) for the given type, newest first.
     * This replaces the "repurposed DELETE" pattern from the Next.js codebase.
     */
    @GetMapping("/list")
    public ResponseEntity<List<TargetKeyResponse>> listKeys(@RequestParam String type) {
        if (type == null || type.isBlank()) {
            throw new IllegalArgumentException("Missing required query param: type");
        }
        return ResponseEntity.ok(targetService.listKeys(type));
    }
}
