package com.journal.app.dto;

import java.util.List;

public class ImagePageResponse {

    private List<ImageResponse> items;
    private String nextCursor;
    private boolean hasMore;

    public ImagePageResponse() {}

    public ImagePageResponse(List<ImageResponse> items, String nextCursor, boolean hasMore) {
        this.items = items;
        this.nextCursor = nextCursor;
        this.hasMore = hasMore;
    }

    public List<ImageResponse> getItems() { return items; }
    public void setItems(List<ImageResponse> items) { this.items = items; }

    public String getNextCursor() { return nextCursor; }
    public void setNextCursor(String nextCursor) { this.nextCursor = nextCursor; }

    public boolean isHasMore() { return hasMore; }
    public void setHasMore(boolean hasMore) { this.hasMore = hasMore; }
}
