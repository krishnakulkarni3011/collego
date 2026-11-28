package com.collego.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReminderRequest {

    @NotBlank(message = "Reminder title is required")
    @Size(max = 200, message = "Reminder title must be 200 characters or fewer")
    private String title;
}
