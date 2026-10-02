package com.journal.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.*;

@Service
public class SupabaseStorageClient {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageClient.class);

    private final RestClient restClient;
    private final String supabaseUrl;
    private final String serviceRoleKey;
    private final String defaultBucket;
    private final ObjectMapper objectMapper;

    public SupabaseStorageClient(
            @Value("${app.supabase.url:}") String supabaseUrl,
            @Value("${app.supabase.service-role-key:}") String serviceRoleKey,
            @Value("${app.supabase.bucket:journal-images}") String defaultBucket,
            ObjectMapper objectMapper) {
        this.supabaseUrl = supabaseUrl != null ? supabaseUrl.replaceAll("/+$", "") : "";
        this.serviceRoleKey = serviceRoleKey != null ? serviceRoleKey.trim() : "";
        this.defaultBucket = defaultBucket != null ? defaultBucket.trim() : "journal-images";
        this.objectMapper = objectMapper;

        this.restClient = RestClient.builder()
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public boolean isConfigured() {
        return !supabaseUrl.isBlank() && !serviceRoleKey.isBlank();
    }

    public String getDefaultBucket() {
        return defaultBucket;
    }

    /**
     * Generate signed upload URL for a specific object path in the bucket.
     */
    public String createSignedUploadUrl(String bucket, String path, int expiresInSeconds) {
        if (!isConfigured()) {
            log.warn("Supabase Storage is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
            return "";
        }

        try {
            String endpoint = String.format("%s/storage/v1/object/upload/sign/%s/%s", supabaseUrl, bucket, path);
            Map<String, Object> body = Map.of("expiresIn", expiresInSeconds);

            String response = restClient.post()
                    .uri(endpoint)
                    .header("apikey", serviceRoleKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode node = objectMapper.readTree(response);
            String url = node.has("url") ? node.get("url").asText() : "";
            if (url.startsWith("http://") || url.startsWith("https://")) {
                return url;
            }
            if (url.startsWith("/")) {
                return supabaseUrl + "/storage/v1" + url;
            }
            return supabaseUrl + "/storage/v1/" + url;
        } catch (Exception e) {
            log.error("Failed to generate signed upload URL for bucket={}, path={}: {}", bucket, path, e.getMessage());
            throw new RuntimeException("Could not generate upload URL: " + e.getMessage(), e);
        }
    }

    /**
     * Batch generate signed read URLs for multiple paths.
     * Returns a map of path -> signedUrl.
     */
    public Map<String, String> createBatchSignedReadUrls(String bucket, List<String> paths, int expiresInSeconds) {
        Map<String, String> results = new HashMap<>();
        if (paths == null || paths.isEmpty()) return results;
        if (!isConfigured()) {
            log.warn("Supabase Storage is not configured; cannot sign read URLs");
            return results;
        }

        try {
            String endpoint = String.format("%s/storage/v1/object/sign/%s", supabaseUrl, bucket);
            Map<String, Object> body = Map.of(
                    "expiresIn", expiresInSeconds,
                    "paths", paths
            );

            String response = restClient.post()
                    .uri(endpoint)
                    .header("apikey", serviceRoleKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            if (root.isArray()) {
                for (JsonNode item : root) {
                    String path = item.has("path") ? item.get("path").asText() : null;
                    String signedUrl = item.has("signedURL") ? item.get("signedURL").asText() :
                                       item.has("signedUrl") ? item.get("signedUrl").asText() : null;

                    if (path != null && signedUrl != null) {
                        String fullUrl;
                        if (signedUrl.startsWith("http://") || signedUrl.startsWith("https://")) {
                            fullUrl = signedUrl;
                        } else if (signedUrl.startsWith("/")) {
                            fullUrl = supabaseUrl + "/storage/v1" + signedUrl;
                        } else {
                            fullUrl = supabaseUrl + "/storage/v1/" + signedUrl;
                        }
                        results.put(path, fullUrl);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to batch sign read URLs for bucket={}, paths={}: {}", bucket, paths, e.getMessage());
        }

        return results;
    }

    /**
     * Generate single signed read / download URL.
     */
    public String createSignedReadUrl(String bucket, String path, int expiresInSeconds, boolean isDownload, String downloadFilename) {
        if (!isConfigured()) return "";

        try {
            String endpoint = String.format("%s/storage/v1/object/sign/%s/%s", supabaseUrl, bucket, path);
            Map<String, Object> body = new HashMap<>();
            body.put("expiresIn", expiresInSeconds);
            if (isDownload) {
                body.put("download", downloadFilename != null ? downloadFilename : true);
            }

            String response = restClient.post()
                    .uri(endpoint)
                    .header("apikey", serviceRoleKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode node = objectMapper.readTree(response);
            String url = node.has("signedURL") ? node.get("signedURL").asText() :
                         node.has("signedUrl") ? node.get("signedUrl").asText() : "";
            if (url.startsWith("http://") || url.startsWith("https://")) {
                return url;
            }
            if (url.startsWith("/")) {
                return supabaseUrl + "/storage/v1" + url;
            }
            return supabaseUrl + "/storage/v1/" + url;
        } catch (Exception e) {
            log.error("Failed to sign read URL for bucket={}, path={}: {}", bucket, path, e.getMessage());
            return "";
        }
    }

    /**
     * Delete objects by paths.
     */
    public void deleteObjects(String bucket, List<String> paths) {
        if (!isConfigured() || paths == null || paths.isEmpty()) return;

        try {
            String endpoint = String.format("%s/storage/v1/object/%s", supabaseUrl, bucket);
            Map<String, Object> body = Map.of("prefixes", paths);

            restClient.method(org.springframework.http.HttpMethod.DELETE)
                    .uri(endpoint)
                    .header("apikey", serviceRoleKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Failed to delete objects in bucket={}, paths={}: {}", bucket, paths, e.getMessage());
        }
    }

    /**
     * Upload binary data directly to Supabase storage.
     */
    public boolean uploadFile(String bucket, String path, byte[] data, String contentType) {
        if (!isConfigured()) return false;
        try {
            String endpoint = String.format("%s/storage/v1/object/%s/%s", supabaseUrl, bucket, path);
            restClient.post()
                    .uri(endpoint)
                    .header("apikey", serviceRoleKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .contentType(MediaType.parseMediaType(contentType != null ? contentType : "image/webp"))
                    .body(data)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.error("Failed to upload object to bucket={}, path={}: {}", bucket, path, e.getMessage());
            return false;
        }
    }

    /**
     * Check if object exists in bucket.
     */
    public boolean verifyObjectExists(String bucket, String path) {
        if (!isConfigured()) return true; // fallback if keys missing in dev
        try {
            String endpoint = String.format("%s/storage/v1/object/info/%s/%s", supabaseUrl, bucket, path);
            var res = restClient.get()
                    .uri(endpoint)
                    .header("apikey", serviceRoleKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .retrieve()
                    .toBodilessEntity();
            return res.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            // Alternatively try signing
            String signed = createSignedReadUrl(bucket, path, 60, false, null);
            return signed != null && !signed.isBlank();
        }
    }
}
