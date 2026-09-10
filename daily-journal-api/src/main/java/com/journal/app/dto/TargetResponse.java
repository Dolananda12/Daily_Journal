package com.journal.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.journal.app.entity.Target;
import com.journal.app.entity.TargetItem;

import java.util.ArrayList;
import java.util.List;

/**
 * Full target response. Shape mirrors the Supabase response the frontend expects.
 * JSON: { "target_type": "monthly", "target_key": "2026-07", "items": [...] }
 */
public class TargetResponse {

    @JsonProperty("target_type")
    private String targetType;

    @JsonProperty("target_key")
    private String targetKey;

    private List<TargetItem> items = new ArrayList<>();

    // ── Static factory ───────────────────────────────────────────

    public static TargetResponse from(Target t) {
        TargetResponse r = new TargetResponse();
        r.targetType = t.getTargetType();
        r.targetKey  = t.getTargetKey();
        r.items      = t.getItems() != null ? t.getItems() : new ArrayList<>();
        return r;
    }

    public static TargetResponse empty(String type, String key) {
        TargetResponse r = new TargetResponse();
        r.targetType = type;
        r.targetKey  = key;
        r.items      = new ArrayList<>();
        return r;
    }

    // ── Getters ──────────────────────────────────────────────────

    public String getTargetType()           { return targetType; }
    public String getTargetKey()            { return targetKey; }
    public List<TargetItem> getItems()      { return items; }
}
