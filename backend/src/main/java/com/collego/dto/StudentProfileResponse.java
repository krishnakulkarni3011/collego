package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentProfileResponse {
    private Long id;
    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private String enrollmentNumber;
    private String departmentName;
    private String departmentCode;
    private Integer currentSemester;
    private String section;
    private Integer admissionYear;
}
