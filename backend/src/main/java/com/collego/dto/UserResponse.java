package com.collego.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private boolean active;
    private Long departmentId;
    private String departmentName;
    private String departmentCode;
    private String enrollmentNumber;
    private Integer semester;
    private String section;
    private Integer admissionYear;
    private Long facultyProfileId;
    private String employeeId;
    private String designation;
    private String resumeFileName;
    private boolean hasResume;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}
