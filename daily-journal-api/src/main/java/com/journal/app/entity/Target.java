package com.journal.app.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Maps to the existing `targets` table in Supabase PostgreSQL.
 * Stores monthly and semester goal lists as JSONB arrays.
 * Unique constraint on (target_type, target_key).
 */
@Entity
@Table(name = "targets",
       uniqueConstraints = @UniqueConstraint(columnNames = {"target_type", "target_key"}))
public class Target {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "target_type", nullable = false)
    private String targetType;

    @Column(name = "target_key", nullable = false)
    private String targetKey;

    @Type(JsonType.class)
    @Column(name = "items", columnDefinition = "jsonb")
    private List<TargetItem> items = new ArrayList<>();

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

    public String getTargetType()               { return targetType; }
    public void setTargetType(String s)         { this.targetType = s; }

    public String getTargetKey()                { return targetKey; }
    public void setTargetKey(String s)          { this.targetKey = s; }

    public List<TargetItem> getItems()          { return items; }
    public void setItems(List<TargetItem> i)    { this.items = i != null ? i : new ArrayList<>(); }

    public Instant getCreatedAt()               { return createdAt; }
    public Instant getUpdatedAt()               { return updatedAt; }
    public void setUpdatedAt(Instant t)         { this.updatedAt = t; }
}
