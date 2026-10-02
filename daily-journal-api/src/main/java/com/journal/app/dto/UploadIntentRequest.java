package com.journal.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public class UploadIntentRequest {

    private String clientId;

    @NotBlank(message = "fileName is required")
    private String fileName;

    @NotBlank(message = "mime is required")
    private String mime;

    @NotNull(message = "width is required")
    private Integer width;

    @NotNull(message = "height is required")
    private Integer height;

    @NotNull(message = "sizeBytes is required")
    private Long sizeBytes;

    @NotBlank(message = "checksum is required")
    private String checksum;

    private Instant takenAt;

    private String blurhash;

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getMime() { return mime; }
    public void setMime(String mime) { this.mime = mime; }

    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }

    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }

    public String getChecksum() { return checksum; }
    public void setChecksum(String checksum) { this.checksum = checksum; }

    public Instant getTakenAt() { return takenAt; }
    public void setTakenAt(Instant takenAt) { this.takenAt = takenAt; }

    public String getBlurhash() { return blurhash; }
    public void setBlurhash(String blurhash) { this.blurhash = blurhash; }
}
