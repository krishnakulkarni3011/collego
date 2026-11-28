package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GraduatedStudentResponse {
    private Long id;
    private String name;
    private String usn;
    private String department;
    private String years;
}
