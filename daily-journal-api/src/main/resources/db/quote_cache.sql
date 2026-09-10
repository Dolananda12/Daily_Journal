-- Run this once in your Supabase SQL editor (or any Postgres client).
-- Creates the quote_cache table used by QuoteService to cache one quote per day.

CREATE TABLE IF NOT EXISTS quote_cache (
    cache_date   DATE         PRIMARY KEY,
    quote_text   TEXT         NOT NULL,
    author       TEXT         NOT NULL,
    fetched_at   TIMESTAMPTZ  DEFAULT now()
);

COMMENT ON TABLE quote_cache IS 'Caches one daily quote per calendar day to avoid re-hitting ZenQuotes rate limits.';
