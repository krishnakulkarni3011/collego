package com.collego.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String role;

    // Student fields (null for other roles)
    private String enrollmentNumber;
    private String departmentName;
    private String departmentCode;
    private Integer currentSemester;
    private String section;
    private Integer admissionYear;

    // Faculty fields (null for other roles)
    private String employeeId;
    private String designation;
}
