package com.collego.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import java.time.Duration;

/**
 * Phase 8 — AWS SDK configuration.
 * Provides a singleton S3Client bean used by S3StorageService.
 *
 * Credentials resolution order (DefaultCredentialsProvider):
 *   1. AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars (docker-compose.prod.yml)
 *   2. IAM instance profile (EC2 role)
 *   3. ~/.aws/credentials (local dev with AWS CLI configured)
 */
@Configuration
public class AwsConfig {

    @Value("${collego.aws.region:ap-south-1}")
    private String awsRegion;

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .httpClientBuilder(ApacheHttpClient.builder()
                        .connectionTimeout(Duration.ofSeconds(10))
                        .socketTimeout(Duration.ofSeconds(60)))
                .build();
    }
}
