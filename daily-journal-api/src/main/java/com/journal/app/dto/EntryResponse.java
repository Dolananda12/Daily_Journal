package com.journal.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.journal.app.entity.Entry;
import com.journal.app.entity.TodoItem;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Full entry response — mirrors the shape of what Supabase previously returned.
 * The frontend uses snake_case JSON keys, so @JsonProperty annotations are used throughout.
 */
public class EntryResponse {

    private UUID id;

    @JsonProperty("entry_date")
    private LocalDate entryDate;

    @JsonProperty("academics_notes")
    private String academicsNotes;

    @JsonProperty("life_notes")
    private String lifeNotes;

    @JsonProperty("hours_studied")
    private BigDecimal hoursStudied;

    @JsonProperty("diary_notes")
    private String diaryNotes;

    private List<TodoItem> todos = new ArrayList<>();

    @JsonProperty("created_at")
    private Instant createdAt;

    @JsonProperty("updated_at")
    private Instant updatedAt;

    // ── Static factory ───────────────────────────────────────────

    public static EntryResponse from(Entry e) {
        EntryResponse r = new EntryResponse();
        r.id             = e.getId();
        r.entryDate      = e.getEntryDate();
        r.academicsNotes = e.getAcademicsNotes();
        r.lifeNotes      = e.getLifeNotes();
        r.hoursStudied   = e.getHoursStudied();
        r.diaryNotes     = e.getDiaryNotes();
        r.todos          = e.getTodos() != null ? e.getTodos() : new ArrayList<>();
        r.createdAt      = e.getCreatedAt();
        r.updatedAt      = e.getUpdatedAt();
        return r;
    }

    // ── Getters ──────────────────────────────────────────────────

    public UUID getId()                  { return id; }
    public LocalDate getEntryDate()      { return entryDate; }
    public String getAcademicsNotes()    { return academicsNotes; }
    public String getLifeNotes()         { return lifeNotes; }
    public BigDecimal getHoursStudied()  { return hoursStudied; }
    public String getDiaryNotes()        { return diaryNotes; }
    public List<TodoItem> getTodos()     { return todos; }
    public Instant getCreatedAt()        { return createdAt; }
    public Instant getUpdatedAt()        { return updatedAt; }
}
