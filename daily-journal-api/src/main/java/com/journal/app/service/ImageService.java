package com.journal.app.service;

import com.journal.app.dto.*;
import com.journal.app.entity.Image;
import com.journal.app.repository.ImageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ImageService {

    private static final Logger log = LoggerFactory.getLogger(ImageService.class);

    private final ImageRepository imageRepository;
    private final SupabaseStorageClient storageClient;
    private final int signedUrlTtlSeconds;
    private final boolean keepOriginals;

    // In-memory cache for signed URLs: path -> CachedUrl (url, expiresAt)
    private final Map<String, CachedUrl> signedUrlCache = new ConcurrentHashMap<>();

    private record CachedUrl(String url, long expiresAtEpochSec) {}

    public ImageService(
            ImageRepository imageRepository,
            SupabaseStorageClient storageClient,
            @Value("${app.supabase.signed-url-ttl-seconds:7200}") int signedUrlTtlSeconds,
            @Value("${app.supabase.keep-originals:false}") boolean keepOriginals) {
        this.imageRepository = imageRepository;
        this.storageClient = storageClient;
        this.signedUrlTtlSeconds = signedUrlTtlSeconds;
        this.keepOriginals = keepOriginals;
    }

    /**
     * Create upload intents for a batch of images.
     */
    @Transactional
    public List<UploadIntentResponse> createUploadIntents(String userId, List<UploadIntentRequest> requests) {
        String bucket = storageClient.getDefaultBucket();
        List<UploadIntentResponse> responses = new ArrayList<>();

        for (UploadIntentRequest req : requests) {
            // 1. Check duplicate
            Optional<Image> existing = imageRepository.findFirstByUserIdAndChecksumSha256AndDeletedAtIsNull(userId, req.getChecksum());
            if (existing.isPresent() && "ready".equals(existing.get().getStatus())) {
                ImageResponse dto = mapToResponse(existing.get(), Map.of(), Map.of());
                // Attach signed URLs for the existing image
                fillSignedUrls(List.of(dto));
                responses.add(UploadIntentResponse.duplicate(req.getClientId(), dto));
                continue;
            }

            // 2. Generate UUID & paths
            UUID imageId = UUID.randomUUID();
            Instant takenAt = req.getTakenAt() != null ? req.getTakenAt() : Instant.now();
            ZonedDateTime zdt = takenAt.atZone(ZoneOffset.UTC);
            String year = String.format("%04d", zdt.getYear());
            String month = String.format("%02d", zdt.getMonthValue());

            String displayPath = String.format("%s/%s/%s/%s.webp", userId, year, month, imageId);
            String thumbPath = String.format("%s/%s/%s/%s_t.webp", userId, year, month, imageId);

            // 3. Save pending record
            Image img = new Image();
            img.setId(imageId);
            img.setUserId(userId);
            img.setStatus("pending");
            img.setStoragePathDisplay(displayPath);
            img.setStoragePathThumb(thumbPath);
            img.setMimeType(req.getMime() != null ? req.getMime() : "image/webp");
            img.setWidth(req.getWidth());
            img.setHeight(req.getHeight());
            img.setSizeBytes(req.getSizeBytes());
            img.setChecksumSha256(req.getChecksum());
            img.setBlurhash(req.getBlurhash());
            img.setTakenAt(takenAt);
            img.setSource("upload");

            imageRepository.save(img);

            // 4. Generate signed upload URLs
            String displayUploadUrl = storageClient.createSignedUploadUrl(bucket, displayPath, 3600);
            String thumbUploadUrl = storageClient.createSignedUploadUrl(bucket, thumbPath, 3600);

            responses.add(UploadIntentResponse.newUpload(imageId, req.getClientId(), displayUploadUrl, thumbUploadUrl));
        }

        return responses;
    }

    /**
     * Mark an image upload complete after client successfully uploaded files to Supabase Storage.
     */
    @Transactional
    public ImageResponse completeUpload(String userId, UUID imageId) {
        Image image = imageRepository.findById(imageId)
                .orElseThrow(() -> new IllegalArgumentException("Image not found: " + imageId));

        if (!image.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized");
        }

        image.setStatus("ready");
        Image saved = imageRepository.save(image);

        ImageResponse response = mapToResponse(saved, Map.of(), Map.of());
        fillSignedUrls(List.of(response));
        return response;
    }

    /**
     * Direct upload fallback (accepts raw file + thumb from frontend and saves directly).
     */
    @Transactional
    public ImageResponse uploadDirect(
            String userId,
            byte[] displayBytes,
            byte[] thumbBytes,
            String mimeType,
            int width,
            int height,
            String checksum,
            Instant takenAt,
            String caption,
            boolean isFavorite) {

        // Check duplicate
        Optional<Image> existing = imageRepository.findFirstByUserIdAndChecksumSha256AndDeletedAtIsNull(userId, checksum);
        if (existing.isPresent() && "ready".equals(existing.get().getStatus())) {
            ImageResponse dto = mapToResponse(existing.get(), Map.of(), Map.of());
            fillSignedUrls(List.of(dto));
            return dto;
        }

        UUID imageId = UUID.randomUUID();
        Instant finalTakenAt = takenAt != null ? takenAt : Instant.now();
        ZonedDateTime zdt = finalTakenAt.atZone(ZoneOffset.UTC);
        String year = String.format("%04d", zdt.getYear());
        String month = String.format("%02d", zdt.getMonthValue());

        String displayPath = String.format("%s/%s/%s/%s.webp", userId, year, month, imageId);
        String thumbPath = String.format("%s/%s/%s/%s_t.webp", userId, year, month, imageId);
        String bucket = storageClient.getDefaultBucket();

        // Upload to storage
        boolean displayOk = storageClient.uploadFile(bucket, displayPath, displayBytes, mimeType);
        if (!displayOk) {
            log.error("Direct upload failed to store binary file in bucket={} path={}", bucket, displayPath);
            throw new RuntimeException("Failed to upload image file to storage. Please ensure Supabase storage bucket exists.");
        }
        if (thumbBytes != null && thumbBytes.length > 0) {
            storageClient.uploadFile(bucket, thumbPath, thumbBytes, mimeType);
        } else {
            storageClient.uploadFile(bucket, thumbPath, displayBytes, mimeType);
        }

        Image img = new Image();
        img.setId(imageId);
        img.setUserId(userId);
        img.setStatus("ready");
        img.setStoragePathDisplay(displayPath);
        img.setStoragePathThumb(thumbPath);
        img.setMimeType(mimeType != null ? mimeType : "image/webp");
        img.setWidth(width);
        img.setHeight(height);
        img.setSizeBytes((long) displayBytes.length);
        img.setChecksumSha256(checksum);
        img.setTakenAt(finalTakenAt);
        img.setCaption(caption);
        img.setFavorite(isFavorite);
        img.setSource("upload");

        Image saved = imageRepository.save(img);
        ImageResponse res = mapToResponse(saved, Map.of(), Map.of());
        fillSignedUrls(List.of(res));
        return res;
    }

    /**
     * Keyset-paginated list of active images.
     */
    public ImagePageResponse listImages(String userId, String cursor, int limit, Boolean favorite, Instant fromDate, Instant toDate) {
        int pageSize = Math.min(Math.max(limit, 1), 100);
        PageRequest pageRequest = PageRequest.of(0, pageSize + 1);

        boolean favOnly = Boolean.TRUE.equals(favorite);
        List<Image> images;
        if (cursor != null && !cursor.isBlank()) {
            CursorDecoded decoded = decodeCursor(cursor);
            if (favOnly) {
                images = imageRepository.findNextPageFavorites(userId, decoded.takenAt, decoded.id, pageRequest);
            } else {
                images = imageRepository.findNextPage(userId, decoded.takenAt, decoded.id, pageRequest);
            }
        } else {
            if (favOnly) {
                images = imageRepository.findInitialPageFavorites(userId, pageRequest);
            } else {
                images = imageRepository.findInitialPage(userId, pageRequest);
            }
        }

        boolean hasMore = images.size() > pageSize;
        List<Image> pageItems = hasMore ? images.subList(0, pageSize) : images;

        String nextCursor = null;
        if (hasMore && !pageItems.isEmpty()) {
            Image last = pageItems.get(pageItems.size() - 1);
            nextCursor = encodeCursor(last.getTakenAt(), last.getId());
        }

        // Collect paths to sign
        List<String> pathsToSign = new ArrayList<>();
        long nowSec = Instant.now().getEpochSecond();

        for (Image img : pageItems) {
            if (!isCached(img.getStoragePathThumb(), nowSec)) {
                pathsToSign.add(img.getStoragePathThumb());
            }
            if (!isCached(img.getStoragePathDisplay(), nowSec)) {
                pathsToSign.add(img.getStoragePathDisplay());
            }
        }

        // Batch sign missing paths
        if (!pathsToSign.isEmpty()) {
            String bucket = storageClient.getDefaultBucket();
            Map<String, String> signed = storageClient.createBatchSignedReadUrls(bucket, pathsToSign, signedUrlTtlSeconds);
            long expirySec = nowSec + signedUrlTtlSeconds - 300; // 5 min safety buffer
            for (Map.Entry<String, String> entry : signed.entrySet()) {
                signedUrlCache.put(entry.getKey(), new CachedUrl(entry.getValue(), expirySec));
            }
        }

        List<ImageResponse> dtoList = pageItems.stream()
                .map(img -> {
                    ImageResponse res = mapToResponse(img, Map.of(), Map.of());
                    CachedUrl thumbCached = signedUrlCache.get(img.getStoragePathThumb());
                    if (thumbCached != null && thumbCached.url() != null && !thumbCached.url().endsWith("/null")) {
                        res.setThumbUrl(thumbCached.url());
                    }
                    CachedUrl displayCached = signedUrlCache.get(img.getStoragePathDisplay());
                    if (displayCached != null && displayCached.url() != null && !displayCached.url().endsWith("/null")) {
                        res.setDisplayUrl(displayCached.url());
                    }
                    return res;
                })
                .toList();

        return new ImagePageResponse(dtoList, nextCursor, hasMore);
    }

    /**
     * Get single image detail with signed read URLs.
     */
    public Optional<ImageResponse> getImage(String userId, UUID imageId) {
        return imageRepository.findByIdAndUserIdAndDeletedAtIsNull(imageId, userId)
                .map(img -> {
                    ImageResponse res = mapToResponse(img, Map.of(), Map.of());
                    fillSignedUrls(List.of(res));
                    return res;
                });
    }

    /**
     * Update image caption or favorite.
     */
    @Transactional
    public Optional<ImageResponse> updateImage(String userId, UUID imageId, ImageUpdateRequest req) {
        return imageRepository.findByIdAndUserIdAndDeletedAtIsNull(imageId, userId)
                .map(img -> {
                    if (req.getCaption() != null) img.setCaption(req.getCaption());
                    if (req.getIsFavorite() != null) img.setFavorite(req.getIsFavorite());
                    Image saved = imageRepository.save(img);
                    ImageResponse res = mapToResponse(saved, Map.of(), Map.of());
                    fillSignedUrls(List.of(res));
                    return res;
                });
    }

    /**
     * Soft delete image.
     */
    @Transactional
    public boolean softDeleteImage(String userId, UUID imageId) {
        return imageRepository.findByIdAndUserIdAndDeletedAtIsNull(imageId, userId)
                .map(img -> {
                    img.setDeletedAt(Instant.now());
                    img.setStatus("deleted");
                    imageRepository.save(img);
                    return true;
                }).orElse(false);
    }

    /**
     * Restore soft deleted image.
     */
    @Transactional
    public Optional<ImageResponse> restoreImage(String userId, UUID imageId) {
        return imageRepository.findById(imageId)
                .filter(img -> img.getUserId().equals(userId))
                .map(img -> {
                    img.setDeletedAt(null);
                    img.setStatus("ready");
                    Image saved = imageRepository.save(img);
                    ImageResponse res = mapToResponse(saved, Map.of(), Map.of());
                    fillSignedUrls(List.of(res));
                    return res;
                });
    }

    /**
     * Get a short-lived download URL.
     */
    public String getDownloadUrl(String userId, UUID imageId) {
        return imageRepository.findByIdAndUserIdAndDeletedAtIsNull(imageId, userId)
                .map(img -> {
                    String bucket = storageClient.getDefaultBucket();
                    String path = img.getStoragePathOriginal() != null ? img.getStoragePathOriginal() : img.getStoragePathDisplay();
                    String filename = img.getId().toString() + ".webp";
                    return storageClient.createSignedReadUrl(bucket, path, 300, true, filename);
                }).orElse("");
    }

    /**
     * Cleanup stale pending records older than 1 hour.
     */
    @Scheduled(fixedDelay = 3600000)
    @Transactional
    public void cleanupStalePendingUploads() {
        try {
            Instant cutoff = Instant.now().minusSeconds(3600);
            List<Image> stale = imageRepository.findByStatusAndCreatedAtBefore("pending", cutoff);
            if (!stale.isEmpty()) {
                log.info("Cleaning up {} stale pending image uploads", stale.size());
                List<String> paths = new ArrayList<>();
                for (Image img : stale) {
                    if (img.getStoragePathDisplay() != null) paths.add(img.getStoragePathDisplay());
                    if (img.getStoragePathThumb() != null) paths.add(img.getStoragePathThumb());
                }
                storageClient.deleteObjects(storageClient.getDefaultBucket(), paths);
                imageRepository.deleteAll(stale);
            }
        } catch (Exception e) {
            log.error("Error during stale upload cleanup: {}", e.getMessage());
        }
    }

    private boolean isCached(String path, long nowSec) {
        if (path == null) return true;
        CachedUrl cached = signedUrlCache.get(path);
        return cached != null && cached.expiresAtEpochSec() > nowSec;
    }

    private void fillSignedUrls(List<ImageResponse> responses) {
        long nowSec = Instant.now().getEpochSecond();
        List<String> toFetch = new ArrayList<>();

        for (ImageResponse res : responses) {
            if (res.getThumbUrl() == null || res.getThumbUrl().endsWith("/null")) {
                res.setThumbUrl(null);
                String thumbPath = getThumbPath(res);
                if (isCached(thumbPath, nowSec)) {
                    String cached = signedUrlCache.get(thumbPath).url();
                    if (cached != null && !cached.endsWith("/null")) {
                        res.setThumbUrl(cached);
                    }
                } else {
                    toFetch.add(thumbPath);
                }
            }
            if (res.getDisplayUrl() == null || res.getDisplayUrl().endsWith("/null")) {
                res.setDisplayUrl(null);
                String displayPath = getDisplayPath(res);
                if (isCached(displayPath, nowSec)) {
                    String cached = signedUrlCache.get(displayPath).url();
                    if (cached != null && !cached.endsWith("/null")) {
                        res.setDisplayUrl(cached);
                    }
                } else {
                    toFetch.add(displayPath);
                }
            }
        }

        if (!toFetch.isEmpty()) {
            String bucket = storageClient.getDefaultBucket();
            Map<String, String> signed = storageClient.createBatchSignedReadUrls(bucket, toFetch, signedUrlTtlSeconds);
            long expirySec = nowSec + signedUrlTtlSeconds - 300;
            for (Map.Entry<String, String> entry : signed.entrySet()) {
                if (entry.getValue() != null && !entry.getValue().endsWith("/null")) {
                    signedUrlCache.put(entry.getKey(), new CachedUrl(entry.getValue(), expirySec));
                }
            }

            for (ImageResponse res : responses) {
                String thumbPath = getThumbPath(res);
                if (res.getThumbUrl() == null && signedUrlCache.containsKey(thumbPath)) {
                    String u = signedUrlCache.get(thumbPath).url();
                    if (u != null && !u.endsWith("/null")) {
                        res.setThumbUrl(u);
                    }
                }
                String displayPath = getDisplayPath(res);
                if (res.getDisplayUrl() == null && signedUrlCache.containsKey(displayPath)) {
                    String u = signedUrlCache.get(displayPath).url();
                    if (u != null && !u.endsWith("/null")) {
                        res.setDisplayUrl(u);
                    }
                }
            }
        }
    }

    private String getDisplayPath(ImageResponse res) {
        ZonedDateTime zdt = res.getTakenAt().atZone(ZoneOffset.UTC);
        return String.format("%s/%04d/%02d/%s.webp", res.getUserId(), zdt.getYear(), zdt.getMonthValue(), res.getId());
    }

    private String getThumbPath(ImageResponse res) {
        ZonedDateTime zdt = res.getTakenAt().atZone(ZoneOffset.UTC);
        return String.format("%s/%04d/%02d/%s_t.webp", res.getUserId(), zdt.getYear(), zdt.getMonthValue(), res.getId());
    }

    private ImageResponse mapToResponse(Image img, Map<String, String> thumbs, Map<String, String> displays) {
        ImageResponse dto = new ImageResponse();
        dto.setId(img.getId());
        dto.setUserId(img.getUserId());
        dto.setStatus(img.getStatus());
        dto.setMimeType(img.getMimeType());
        dto.setWidth(img.getWidth());
        dto.setHeight(img.getHeight());
        dto.setSizeBytes(img.getSizeBytes());
        dto.setChecksumSha256(img.getChecksumSha256());
        dto.setBlurhash(img.getBlurhash());
        dto.setTakenAt(img.getTakenAt());
        dto.setCreatedAt(img.getCreatedAt());
        dto.setCaption(img.getCaption());
        dto.setFavorite(img.isFavorite());
        dto.setSource(img.getSource());

        dto.setThumbUrl(thumbs.get(img.getStoragePathThumb()));
        dto.setDisplayUrl(displays.get(img.getStoragePathDisplay()));
        return dto;
    }

    private String encodeCursor(Instant takenAt, UUID id) {
        String raw = takenAt.toEpochMilli() + "_" + id.toString();
        return Base64.getUrlEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private CursorDecoded decodeCursor(String cursor) {
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = decoded.split("_", 2);
            long epochMilli = Long.parseLong(parts[0]);
            UUID id = UUID.fromString(parts[1]);
            return new CursorDecoded(Instant.ofEpochMilli(epochMilli), id);
        } catch (Exception e) {
            log.warn("Failed to parse cursor: {}", cursor);
            return new CursorDecoded(Instant.now(), UUID.randomUUID());
        }
    }

    private record CursorDecoded(Instant takenAt, UUID id) {}
}
