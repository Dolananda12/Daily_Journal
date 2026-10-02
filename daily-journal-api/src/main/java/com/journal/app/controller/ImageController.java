package com.journal.app.controller;

import com.journal.app.dto.*;
import com.journal.app.service.ImageService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/images")
@CrossOrigin(origins = "${app.cors-allowed-origins}")
public class ImageController {

    private final ImageService imageService;
    private static final String DEFAULT_USER_ID = "owner";

    public ImageController(ImageService imageService) {
        this.imageService = imageService;
    }

    /**
     * POST /api/images/upload-intents
     * Request signed upload URLs for a batch of images.
     */
    @PostMapping("/upload-intents")
    public ResponseEntity<List<UploadIntentResponse>> createUploadIntents(
            @Valid @RequestBody List<UploadIntentRequest> requests) {
        List<UploadIntentResponse> responses = imageService.createUploadIntents(DEFAULT_USER_ID, requests);
        return ResponseEntity.ok(responses);
    }

    /**
     * POST /api/images/{id}/complete
     * Confirm direct upload to Supabase Storage completed.
     */
    @PostMapping("/{id}/complete")
    public ResponseEntity<ImageResponse> completeUpload(@PathVariable UUID id) {
        ImageResponse res = imageService.completeUpload(DEFAULT_USER_ID, id);
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/images
     * Keyset-paginated list of photos.
     */
    @GetMapping
    public ResponseEntity<ImagePageResponse> listImages(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "60") int limit,
            @RequestParam(required = false) Boolean favorite,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        Instant fromInstant = from != null ? from.atStartOfDay().toInstant(ZoneOffset.UTC) : null;
        Instant toInstant = to != null ? to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC).minusMillis(1) : null;

        ImagePageResponse response = imageService.listImages(
                DEFAULT_USER_ID, cursor, limit, favorite, fromInstant, toInstant);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/images/{id}
     * Get image details.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ImageResponse> getImage(@PathVariable UUID id) {
        return imageService.getImage(DEFAULT_USER_ID, id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PATCH /api/images/{id}
     * Update caption or favorite.
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ImageResponse> updateImage(
            @PathVariable UUID id,
            @RequestBody ImageUpdateRequest request) {
        return imageService.updateImage(DEFAULT_USER_ID, id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * DELETE /api/images/{id}
     * Soft delete image.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteImage(@PathVariable UUID id) {
        boolean deleted = imageService.softDeleteImage(DEFAULT_USER_ID, id);
        if (deleted) {
            return ResponseEntity.ok(Map.of("message", "Image deleted"));
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * POST /api/images/{id}/restore
     * Restore soft-deleted image.
     */
    @PostMapping("/{id}/restore")
    public ResponseEntity<ImageResponse> restoreImage(@PathVariable UUID id) {
        return imageService.restoreImage(DEFAULT_USER_ID, id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/images/{id}/download
     * Redirect to short-lived signed download URL.
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadImage(@PathVariable UUID id) {
        String downloadUrl = imageService.getDownloadUrl(DEFAULT_USER_ID, id);
        if (downloadUrl != null && !downloadUrl.isBlank()) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(downloadUrl))
                    .build();
        }
        return ResponseEntity.notFound().build();
    }
}
