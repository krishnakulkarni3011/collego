package com.collego.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Phase 9: Bean configuration for AI service HTTP client.
 * RestTemplate with timeouts so a slow/down ai-service never blocks the main API.
 * Uses SimpleClientHttpRequestFactory for Spring Boot 3.2 compatibility.
 */
@Configuration
public class AiServiceConfig {

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);   // 5 seconds connect timeout
        factory.setReadTimeout(60_000);     // 60 seconds read timeout (LLM calls can be slow)
        return new RestTemplate(factory);
    }

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
