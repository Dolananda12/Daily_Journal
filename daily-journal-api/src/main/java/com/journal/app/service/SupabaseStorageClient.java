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

import jakarta.annotation.PostConstruct;
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

    @PostConstruct
    public void init() {
        if (isConfigured()) {
            ensureBucketExists(defaultBucket);
        }
    }

    public synchronized void ensureBucketExists(String bucket) {
        if (!isConfigured()) return;
        try {
            String getEndpoint = String.format("%s/storage/v1/bucket/%s", supabaseUrl, bucket);
            var res = restClient.get()
                    .uri(getEndpoint)
                    .header("apikey", serviceRoleKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .retrieve()
                    .toBodilessEntity();
            if (res.getStatusCode().is2xxSuccessful()) {
                return;
            }
        } catch (Exception e) {
            log.info("Bucket '{}' not verified via GET, attempting auto-creation: {}", bucket, e.getMessage());
        }

        try {
            String createEndpoint = String.format("%s/storage/v1/bucket", supabaseUrl);
            Map<String, Object> body = Map.of(
                    "id", bucket,
                    "name", bucket,
                    "public", false,
                    "file_size_limit", 52428800L
            );

            restClient.post()
                    .uri(createEndpoint)
                    .header("apikey", serviceRoleKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Supabase storage bucket '{}' created successfully", bucket);
        } catch (Exception e) {
            log.warn("Could not auto-create Supabase storage bucket '{}': {}", bucket, e.getMessage());
        }
    }

    public boolean isConfigured() {
        return !supabaseUrl.isBlank() && !serviceRoleKey.isBlank();
    }

    public String getDefaultBucket() {
        return defaultBucket;
    }

    public String formatStorageUrl(String url) {
        if (url == null || url.isBlank() || "null".equalsIgnoreCase(url.trim())) return "";
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        if (url.startsWith("/storage/v1")) {
            return supabaseUrl + url;
        }
        if (url.startsWith("/")) {
            return supabaseUrl + "/storage/v1" + url;
        }
        return supabaseUrl + "/storage/v1/" + url;
    }

    public Map<String, Object> getStorageStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("configured", isConfigured());
        status.put("supabaseUrl", supabaseUrl);
        status.put("defaultBucket", defaultBucket);
        if (!isConfigured()) {
            status.put("status", "NOT_CONFIGURED");
            return status;
        }
        try {
            String endpoint = String.format("%s/storage/v1/bucket", supabaseUrl);
            String response = restClient.get()
                    .uri(endpoint)
                    .header("apikey", serviceRoleKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .retrieve()
                    .body(String.class);
            JsonNode root = objectMapper.readTree(response);
            List<String> bucketNames = new ArrayList<>();
            if (root.isArray()) {
                for (JsonNode b : root) {
                    if (b.hasNonNull("name")) bucketNames.add(b.get("name").asText());
                }
            }
            status.put("bucketsInProject", bucketNames);
            boolean bucketFound = bucketNames.contains(defaultBucket);
            if (!bucketFound) {
                ensureBucketExists(defaultBucket);
                status.put("autoCreatedAttempted", true);
            }
            status.put("bucketReady", true);
            status.put("status", "HEALTHY");
        } catch (Exception e) {
            status.put("status", "ERROR");
            status.put("error", e.getMessage());
        }
        return status;
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
            ensureBucketExists(bucket);
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
            String url = node.hasNonNull("url") ? node.get("url").asText() : "";
            return formatStorageUrl(url);
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
                    if (item.hasNonNull("error")) {
                        continue;
                    }
                    String path = item.hasNonNull("path") ? item.get("path").asText() : null;
                    JsonNode signedNode = item.hasNonNull("signedURL") ? item.get("signedURL") :
                                          item.hasNonNull("signedUrl") ? item.get("signedUrl") : null;

                    if (path != null && signedNode != null && !signedNode.isNull()) {
                        String signedUrl = signedNode.asText();
                        if (signedUrl != null && !signedUrl.isBlank() && !"null".equalsIgnoreCase(signedUrl.trim())) {
                            String fullUrl = formatStorageUrl(signedUrl);
                            if (!fullUrl.isBlank()) {
                                results.put(path, fullUrl);
                            }
                        }
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
            JsonNode urlNode = node.hasNonNull("signedURL") ? node.get("signedURL") :
                               node.hasNonNull("signedUrl") ? node.get("signedUrl") : null;
            if (urlNode == null || urlNode.isNull()) return "";
            return formatStorageUrl(urlNode.asText());
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
