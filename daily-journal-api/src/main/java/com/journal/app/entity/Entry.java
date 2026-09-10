package com.journal.app.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Maps to the existing `entries` table in Supabase PostgreSQL.
 * Column names match exactly — ddl-auto is set to "none" so Hibernate never touches the schema.
 */
@Entity
@Table(name = "entries")
public class Entry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @JsonProperty("entry_date")
    @Column(name = "entry_date", unique = true, nullable = false)
    private LocalDate entryDate;

    @JsonProperty("academics_notes")
    @Column(name = "academics_notes", columnDefinition = "TEXT")
    private String academicsNotes;

    @JsonProperty("life_notes")
    @Column(name = "life_notes", columnDefinition = "TEXT")
    private String lifeNotes;

    @JsonProperty("hours_studied")
    @Column(name = "hours_studied", precision = 5, scale = 1)
    private BigDecimal hoursStudied;

    @JsonProperty("diary_notes")
    @Column(name = "diary_notes", columnDefinition = "TEXT")
    private String diaryNotes;

    @Type(JsonType.class)
    @Column(name = "todos", columnDefinition = "jsonb")
    private List<TodoItem> todos = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // ── Lifecycle hooks ──────────────────────────────────────────

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    // ── Getters & Setters ────────────────────────────────────────

    public UUID getId()                         { return id; }

    public LocalDate getEntryDate()             { return entryDate; }
    public void setEntryDate(LocalDate d)       { this.entryDate = d; }

    public String getAcademicsNotes()           { return academicsNotes; }
    public void setAcademicsNotes(String s)     { this.academicsNotes = s; }

    public String getLifeNotes()                { return lifeNotes; }
    public void setLifeNotes(String s)          { this.lifeNotes = s; }

    public BigDecimal getHoursStudied()         { return hoursStudied; }
    public void setHoursStudied(BigDecimal v)   { this.hoursStudied = v; }

    public String getDiaryNotes()               { return diaryNotes; }
    public void setDiaryNotes(String s)         { this.diaryNotes = s; }

    public List<TodoItem> getTodos()            { return todos; }
    public void setTodos(List<TodoItem> t)      { this.todos = t != null ? t : new ArrayList<>(); }

    public Instant getCreatedAt()               { return createdAt; }
    public Instant getUpdatedAt()               { return updatedAt; }
}
