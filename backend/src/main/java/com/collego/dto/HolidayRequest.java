package com.collego.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class HolidayRequest {

    @NotNull(message = "Section ID is required")
    private Long sectionId;

    @NotNull(message = "Date is required")
    private LocalDate date;

    @Size(max = 300, message = "Note cannot exceed 300 characters")
    private String note;
}
