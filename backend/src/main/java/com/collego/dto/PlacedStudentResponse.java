package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlacedStudentResponse {
    private Long id;
    private Long studentId;
    private String name;
    private String usn;
    private String companyName;
    private String salary;
    private String role;
    private String department;
}
