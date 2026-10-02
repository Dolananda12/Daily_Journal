package com.journal.app.dto;

import java.util.UUID;

public class UploadIntentResponse {

    private UUID imageId;
    private String clientId;
    private String displayUploadUrl;
    private String thumbUploadUrl;
    private boolean duplicate;
    private ImageResponse existingImage;

    public UploadIntentResponse() {}

    public static UploadIntentResponse duplicate(String clientId, ImageResponse existingImage) {
        UploadIntentResponse res = new UploadIntentResponse();
        res.setClientId(clientId);
        res.setDuplicate(true);
        res.setExistingImage(existingImage);
        if (existingImage != null) {
            res.setImageId(existingImage.getId());
        }
        return res;
    }

    public static UploadIntentResponse newUpload(UUID imageId, String clientId, String displayUploadUrl, String thumbUploadUrl) {
        UploadIntentResponse res = new UploadIntentResponse();
        res.setImageId(imageId);
        res.setClientId(clientId);
        res.setDisplayUploadUrl(displayUploadUrl);
        res.setThumbUploadUrl(thumbUploadUrl);
        res.setDuplicate(false);
        return res;
    }

    public UUID getImageId() { return imageId; }
    public void setImageId(UUID imageId) { this.imageId = imageId; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getDisplayUploadUrl() { return displayUploadUrl; }
    public void setDisplayUploadUrl(String displayUploadUrl) { this.displayUploadUrl = displayUploadUrl; }

    public String getThumbUploadUrl() { return thumbUploadUrl; }
    public void setThumbUploadUrl(String thumbUploadUrl) { this.thumbUploadUrl = thumbUploadUrl; }

    public boolean isDuplicate() { return duplicate; }
    public void setDuplicate(boolean duplicate) { this.duplicate = duplicate; }

    public ImageResponse getExistingImage() { return existingImage; }
    public void setExistingImage(ImageResponse existingImage) { this.existingImage = existingImage; }
}
