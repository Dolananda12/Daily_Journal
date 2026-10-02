package com.journal.app.dto;

public class ImageUpdateRequest {

    private String caption;
    private Boolean isFavorite;

    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }

    public Boolean getIsFavorite() { return isFavorite; }
    public void setIsFavorite(Boolean isFavorite) { this.isFavorite = isFavorite; }
}
