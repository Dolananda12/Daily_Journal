package com.journal.app.dto;

import java.time.Instant;
import java.util.UUID;

public class ImageResponse {

    private UUID id;
    private String userId;
    private String status;
    private String thumbUrl;
    private String displayUrl;
    private String mimeType;
    private Integer width;
    private Integer height;
    private Long sizeBytes;
    private String checksumSha256;
    private String blurhash;
    private Instant takenAt;
    private Instant createdAt;
    private String caption;
    private boolean isFavorite;
    private String source;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getThumbUrl() { return thumbUrl; }
    public void setThumbUrl(String thumbUrl) { this.thumbUrl = thumbUrl; }

    public String getDisplayUrl() { return displayUrl; }
    public void setDisplayUrl(String displayUrl) { this.displayUrl = displayUrl; }

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
}
