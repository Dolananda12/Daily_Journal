package com.journal.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

/**
 * Lightweight response for listing target keys.
 * Used by GET /api/targets/list?type=semester.
 * JSON: { "target_key": "Sem 1 · 2026-27", "updated_at": "..." }
 */
public class TargetKeyResponse {

    @JsonProperty("target_key")
    private String targetKey;

    @JsonProperty("updated_at")
    private Instant updatedAt;

    public TargetKeyResponse() {}

    public TargetKeyResponse(String targetKey, Instant updatedAt) {
        this.targetKey = targetKey;
        this.updatedAt = updatedAt;
    }

    public String getTargetKey()        { return targetKey; }
    public Instant getUpdatedAt()       { return updatedAt; }
}
