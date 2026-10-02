-- SQL Migration: images table for Supabase Storage Photo Gallery
-- Run this in the Supabase SQL Editor (or psql)

CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'owner',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'ready', 'failed', 'deleted'
    storage_path_display TEXT NOT NULL,
    storage_path_thumb TEXT NOT NULL,
    storage_path_original TEXT NULL,
    mime_type TEXT NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    blurhash TEXT NULL,
    taken_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    caption TEXT NULL,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    source TEXT NOT NULL DEFAULT 'upload',
    deleted_at TIMESTAMPTZ NULL
);

-- Index for keyset pagination: newest taken_at first, with id as tiebreaker
CREATE INDEX IF NOT EXISTS idx_images_user_taken_id 
    ON images (user_id, taken_at DESC, id DESC);

-- Unique constraint / index per user for duplicate detection
CREATE INDEX IF NOT EXISTS idx_images_user_checksum 
    ON images (user_id, checksum_sha256);

-- Partial index for active (non-deleted) queries
CREATE INDEX IF NOT EXISTS idx_images_active_taken 
    ON images (user_id, taken_at DESC) 
    WHERE deleted_at IS NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Note: Since Spring Boot accesses Supabase directly via JDBC / Service Role, 
-- no public access policies are required. The private bucket 'journal-images' 
-- also does not need public policies.
