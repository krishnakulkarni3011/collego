package com.collego.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SgpaResponse {
    private Long semesterId;
    private String semesterName;
    private Integer semesterNumber;
    private String academicYear;
    private List<SemesterMarksResponse> subjects;
    private double totalCredits;
    private double sgpa;
}
