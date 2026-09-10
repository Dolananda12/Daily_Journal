package com.journal.app.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "photos")
public class Photo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "data", nullable = false)
    private byte[] data;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getFileName() { return fileName; }
    public void setFileName(String f) { this.fileName = f; }
    public String getContentType() { return contentType; }
    public void setContentType(String c) { this.contentType = c; }
    public byte[] getData() { return data; }
    public void setData(byte[] d) { this.data = d; }
    public Instant getCreatedAt() { return createdAt; }
}
