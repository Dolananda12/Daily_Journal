package com.journal.app.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "images")
public class Image {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private String userId = "owner";

    @Column(name = "status", nullable = false)
    private String status = "pending"; // pending, ready, failed, deleted

    @Column(name = "storage_path_display", nullable = false)
    private String storagePathDisplay;

    @Column(name = "storage_path_thumb", nullable = false)
    private String storagePathThumb;

    @Column(name = "storage_path_original")
    private String storagePathOriginal;

    @Column(name = "mime_type", nullable = false)
    private String mimeType;

    @Column(name = "width", nullable = false)
    private Integer width;

    @Column(name = "height", nullable = false)
    private Integer height;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "checksum_sha256", nullable = false)
    private String checksumSha256;

    @Column(name = "blurhash")
    private String blurhash;

    @Column(name = "taken_at", nullable = false)
    private Instant takenAt;

    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @Column(name = "caption")
    private String caption;

    @Column(name = "is_favorite", nullable = false)
    private boolean isFavorite = false;

    @Column(name = "source", nullable = false)
    private String source = "upload";

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (userId == null) userId = "owner";
        if (status == null) status = "pending";
        if (source == null) source = "upload";
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getStoragePathDisplay() { return storagePathDisplay; }
    public void setStoragePathDisplay(String storagePathDisplay) { this.storagePathDisplay = storagePathDisplay; }

    public String getStoragePathThumb() { return storagePathThumb; }
    public void setStoragePathThumb(String storagePathThumb) { this.storagePathThumb = storagePathThumb; }

    public String getStoragePathOriginal() { return storagePathOriginal; }
    public void setStoragePathOriginal(String storagePathOriginal) { this.storagePathOriginal = storagePathOriginal; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }

    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }

    public String getChecksumSha256() { return checksumSha256; }
    public void setChecksumSha256(String checksumSha256) { this.checksumSha256 = checksumSha256; }

    public String getBlurhash() { return blurhash; }
    public void setBlurhash(String blurhash) { this.blurhash = blurhash; }

    public Instant getTakenAt() { return takenAt; }
    public void setTakenAt(Instant takenAt) { this.takenAt = takenAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }

    public boolean isFavorite() { return isFavorite; }
    public void setFavorite(boolean favorite) { isFavorite = favorite; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
}
