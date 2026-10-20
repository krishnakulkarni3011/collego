package com.collego;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CollegoApplication {
    public static void main(String[] args) {
        SpringApplication.run(CollegoApplication.class, args);
    }
}
