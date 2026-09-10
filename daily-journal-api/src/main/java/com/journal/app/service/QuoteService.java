package com.journal.app.service;

import com.journal.app.dto.QuoteResponse;
import com.journal.app.entity.QuoteCache;
import com.journal.app.repository.QuoteCacheRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Fetches and caches one daily quote.
 *
 * Priority chain (matches the existing Next.js /api/quote route):
 *  1. DB cache — if today's quote is already stored, return it immediately.
 *  2. Primary API — Prayush Adhikari Quotes API (free, no key, ~500k quotes).
 *  3. Fallback API — ZenQuotes.io (free, no key, rate-limited to ~5 req/30s).
 *  4. Local hardcoded list — always works; prevents a blank UI.
 *
 * A @Scheduled job pre-fetches just after midnight so the first user of the day
 * never blocks on the external API call.
 */
@Service
public class QuoteService {

    private static final Logger log = LoggerFactory.getLogger(QuoteService.class);
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    // Curated fallback list — identical to the one in the Next.js route
    private static final List<QuoteResponse> FALLBACK_QUOTES = List.of(
        new QuoteResponse("Live as if you were to die tomorrow. Learn as if you were to live forever.", "Mahatma Gandhi"),
        new QuoteResponse("The beautiful thing about learning is that nobody can take it away from you.", "B.B. King"),
        new QuoteResponse("An investment in knowledge pays the best interest.", "Benjamin Franklin"),
        new QuoteResponse("The only true wisdom is in knowing you know nothing.", "Socrates"),
        new QuoteResponse("It does not matter how slowly you go as long as you do not stop.", "Confucius"),
        new QuoteResponse("We are what we repeatedly do. Excellence, then, is not an act, but a habit.", "Aristotle"),
        new QuoteResponse("The mind is not a vessel to be filled, but a fire to be kindled.", "Plutarch")
    );

    private final QuoteCacheRepository quoteCacheRepository;
    private final RestTemplate restTemplate;

    @Value("${app.quote.primary-url}")
    private String primaryUrl;

    @Value("${app.quote.fallback-url}")
    private String fallbackUrl;

    public QuoteService(QuoteCacheRepository quoteCacheRepository, RestTemplate restTemplate) {
        this.quoteCacheRepository = quoteCacheRepository;
        this.restTemplate         = restTemplate;
    }

    // ── Public API ───────────────────────────────────────────────

    /**
     * Returns today's quote. Always succeeds — never throws.
     */
    @Transactional
    public QuoteResponse getTodayQuote() {
        LocalDate today = LocalDate.now(IST);

        // 1. Check DB cache
        Optional<QuoteCache> cached = quoteCacheRepository.findByCacheDate(today);
        if (cached.isPresent()) {
            return new QuoteResponse(cached.get().getQuoteText(), cached.get().getAuthor());
        }

        // 2–4. Fetch and cache
        QuoteResponse fetched = fetchFromApis();
        persistToCache(today, fetched);
        return fetched;
    }

    // ── Scheduled pre-fetch ──────────────────────────────────────

    /**
     * Runs at 00:05 IST every day to pre-warm the cache so the first
     * request of the day is instant.
     * Cron: second minute hour day-of-month month day-of-week
     */
    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Kolkata")
    @Transactional
    public void prefetchDailyQuote() {
        log.info("Scheduled quote pre-fetch running...");
        LocalDate today = LocalDate.now(IST);
        if (quoteCacheRepository.findByCacheDate(today).isEmpty()) {
            QuoteResponse q = fetchFromApis();
            persistToCache(today, q);
            log.info("Pre-fetched quote for {}: {}", today, q.getQ());
        } else {
            log.info("Quote for {} already cached, skipping.", today);
        }
    }

    // ── Internal helpers ─────────────────────────────────────────

    private QuoteResponse fetchFromApis() {
        // 2. Primary — Prayush Adhikari
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = restTemplate.getForObject(primaryUrl, Map.class);
            if (body != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, String>> data = (List<Map<String, String>>) body.get("data");
                if (data != null && !data.isEmpty()) {
                    String q = data.get(0).get("quote");
                    String a = data.get(0).get("author");
                    if (q != null && a != null) {
                        return new QuoteResponse(q, a);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Primary quote API failed: {}", e.getMessage());
        }

        // 3. Fallback — ZenQuotes
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, String>> data = restTemplate.getForObject(fallbackUrl, List.class);
            if (data != null && !data.isEmpty()) {
                String q = data.get(0).get("q");
                String a = data.get(0).get("a");
                if (q != null && a != null) {
                    return new QuoteResponse(q, a);
                }
            }
        } catch (Exception e) {
            log.warn("ZenQuotes fallback failed: {}", e.getMessage());
        }

        // 4. Local hardcoded list
        int idx = (int) (Math.random() * FALLBACK_QUOTES.size());
        return FALLBACK_QUOTES.get(idx);
    }

    @Transactional
    protected void persistToCache(LocalDate date, QuoteResponse q) {
        try {
            QuoteCache cache = new QuoteCache(date, q.getQ(), q.getA());
            quoteCacheRepository.save(cache);
        } catch (Exception e) {
            // Non-fatal: if DB write fails, the quote was still returned to the user
            log.warn("Failed to persist quote to cache: {}", e.getMessage());
        }
    }
}
