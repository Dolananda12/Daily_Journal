package com.journal.app.controller;

import com.journal.app.dto.QuoteResponse;
import com.journal.app.service.QuoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/quote
 * Returns today's cached quote. Always returns 200 — falls back to a local
 * hardcoded list if both external APIs are unavailable.
 */
@RestController
@RequestMapping("/api/quote")
public class QuoteController {

    private final QuoteService quoteService;

    public QuoteController(QuoteService quoteService) {
        this.quoteService = quoteService;
    }

    @GetMapping
    public ResponseEntity<QuoteResponse> getDailyQuote() {
        return ResponseEntity.ok(quoteService.getTodayQuote());
    }
}
