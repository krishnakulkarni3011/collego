package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SetPasswordRequest {
    @NotBlank(message = "Password is required")
    private String password;
}
