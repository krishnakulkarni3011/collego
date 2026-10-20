package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {
    private String firstName;
    private String lastName;
    private String email;
    private Long departmentId;

    private String enrollmentNumber;
    private Integer semester;
    private String section;
    private Integer admissionYear;
    private String employeeId;
    private String designation;
}
