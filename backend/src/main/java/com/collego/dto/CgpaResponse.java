package com.collego.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CgpaResponse {
    private List<SgpaResponse> semesters;
    private double totalCreditsAllSemesters;
    private double cumulativeCgpa;
}
