package com.journal.app.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Configures the RestTemplate bean used by QuoteService to call external quote APIs.
 * Timeouts are kept short (6s connect, 8s read) to avoid slow API calls blocking threads.
 *
 * Note: RestTemplateBuilder.connectTimeout(Duration) was removed in Spring Boot 3.2+;
 * using SimpleClientHttpRequestFactory directly instead.
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(6_000);  // 6 seconds
        factory.setReadTimeout(8_000);     // 8 seconds
        return new RestTemplate(factory);
    }
}
