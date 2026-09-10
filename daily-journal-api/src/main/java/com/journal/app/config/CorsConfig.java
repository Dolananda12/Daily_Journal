package com.journal.app.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS configuration — required because the frontend (Vercel) and backend
 * are now on separate origins. Allows the Vercel frontend to call /api/**.
 *
 * Allowed origins are read from the CORS_ALLOWED_ORIGINS env var (comma-separated).
 * Default: http://localhost:3000 for local development.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.cors-allowed-origins}")
    private String corsAllowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = corsAllowedOrigins.split(",");
        registry.addMapping("/api/**")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);
    }
}
