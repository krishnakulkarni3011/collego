package com.collego.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacultyDirectoryResponse {
    /** FacultyProfile id, used for resume operations. */
    private Long id;
    private Long userId;
    private String name;
    private String email;
    private String employeeId;
    private String designation;
    private Long departmentId;
    private String departmentName;
    private String departmentCode;
    private String resumeFileName;
    private boolean hasResume;
    private boolean active;
}
