package com.journal.app.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Maps to the `quote_cache` table (created via db/quote_cache.sql).
 * Stores one quote per calendar day so ZenQuotes is hit at most once per day.
 */
@Entity
@Table(name = "quote_cache")
public class QuoteCache {

    /** One row per day — the date IS the primary key. */
    @Id
    @Column(name = "cache_date", nullable = false)
    private LocalDate cacheDate;

    @Column(name = "quote_text", nullable = false, columnDefinition = "TEXT")
    private String quoteText;

    @Column(name = "author", nullable = false)
    private String author;

    @Column(name = "fetched_at")
    private Instant fetchedAt;

    // ── Constructors ─────────────────────────────────────────────

    public QuoteCache() {}

    public QuoteCache(LocalDate cacheDate, String quoteText, String author) {
        this.cacheDate  = cacheDate;
        this.quoteText  = quoteText;
        this.author     = author;
        this.fetchedAt  = Instant.now();
    }

    // ── Getters & Setters ────────────────────────────────────────

    public LocalDate getCacheDate()             { return cacheDate; }
    public void setCacheDate(LocalDate d)       { this.cacheDate = d; }

    public String getQuoteText()                { return quoteText; }
    public void setQuoteText(String s)          { this.quoteText = s; }

    public String getAuthor()                   { return author; }
    public void setAuthor(String s)             { this.author = s; }

    public Instant getFetchedAt()               { return fetchedAt; }
    public void setFetchedAt(Instant t)         { this.fetchedAt = t; }
}
