package com.journal.app.controller;

import com.journal.app.dto.EntryMetaResponse;
import com.journal.app.dto.EntryRequest;
import com.journal.app.dto.EntryResponse;
import com.journal.app.service.EntryService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Handles all /api/entries routes.
 *
 * Endpoint map (mirrors the existing Next.js API surface exactly):
 *   GET  /api/entries                  → metadata list (entry_date, hours_studied)
 *   GET  /api/entries?from=&to=        → full entries within date range
 *   GET  /api/entries/{date}           → single full entry
 *   PUT  /api/entries/{date}           → upsert today's entry (future/past locked)
 */
@RestController
@RequestMapping("/api/entries")
public class EntryController {

    private final EntryService entryService;

    public EntryController(EntryService entryService) {
        this.entryService = entryService;
    }

    /**
     * GET /api/entries
     * Without query params: returns lightweight metadata for all entries (calendar dots).
     * With ?from=&to=:      returns full entry data for that range (Browse/Stats views).
     */
    @GetMapping
    public ResponseEntity<?> getEntries(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        if (from != null && to != null) {
            // Range query — return full entry objects
            List<EntryResponse> entries = entryService.getRange(from, to);
            return ResponseEntity.ok(entries);
        }

        // Default — lightweight metadata only
        List<EntryMetaResponse> meta = entryService.getAllMetadata();
        return ResponseEntity.ok(meta);
    }

    /**
     * GET /api/entries/{date}
     * Returns the full entry for the given date, or null if none exists.
     */
    @GetMapping("/{date}")
    public ResponseEntity<EntryResponse> getByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        return entryService.getByDate(date)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(null));  // null → frontend renders empty form
    }

    /**
     * PUT /api/entries/{date}
     * Create or update today's entry. Enforces future-lock and past-lock.
     * Returns 400 if date is in the future, 403 if date is in the past.
     */
    @PutMapping("/{date}")
    public ResponseEntity<EntryResponse> upsertEntry(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody EntryRequest request) {

        EntryResponse saved = entryService.upsertEntry(date, request);
        return ResponseEntity.ok(saved);
    }
}
