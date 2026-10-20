package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 80, message = "First name is too long")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 80, message = "Last name is too long")
    private String lastName;

    @Size(max = 20, message = "Phone number is too long")
    private String phone;
}
