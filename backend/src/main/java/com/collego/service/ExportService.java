package com.collego.service;

import com.collego.entity.FacultyProfile;
import com.collego.entity.StudentProfile;
import com.collego.entity.User;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.StudentProfileRepository;
import com.collego.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Server-side CSV exports. Building these on the backend keeps large datasets
 * out of the browser and guarantees the same data the admin sees.
 */
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ExportService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final FacultyProfileRepository facultyProfileRepository;

    public byte[] studentsCsv() {
        StringBuilder sb = new StringBuilder();
        sb.append("USN,First Name,Last Name,Email,Department,Semester,Section,Admission Year,Active\n");
        List<User> students = userRepository.findByRole(com.collego.entity.Role.STUDENT);

        for (User user : students) {
            StudentProfile profile = studentProfileRepository.findByUserId(user.getId()).orElse(null);
            sb.append(csv(profile != null ? profile.getEnrollmentNumber() : ""))
                    .append(',').append(csv(user.getFirstName()))
                    .append(',').append(csv(user.getLastName()))
                    .append(',').append(csv(user.getEmail()))
                    .append(',').append(csv(profile != null && profile.getDepartment() != null
                            ? profile.getDepartment().getCode() : ""))
                    .append(',').append(profile != null && profile.getSemester() != null ? profile.getSemester() : "")
                    .append(',').append(csv(profile != null ? profile.getSection() : ""))
                    .append(',').append(profile != null && profile.getAdmissionYear() != null ? profile.getAdmissionYear() : "")
                    .append(',').append(user.isActive() ? "Yes" : "No")
                    .append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] facultyCsv() {
        StringBuilder sb = new StringBuilder();
        sb.append("Employee ID,First Name,Last Name,Email,Department,Designation,Active\n");
        List<User> faculty = userRepository.findByRole(com.collego.entity.Role.FACULTY);

        for (User user : faculty) {
            FacultyProfile profile = facultyProfileRepository.findByUserId(user.getId()).orElse(null);
            sb.append(csv(profile != null ? profile.getEmployeeId() : ""))
                    .append(',').append(csv(user.getFirstName()))
                    .append(',').append(csv(user.getLastName()))
                    .append(',').append(csv(user.getEmail()))
                    .append(',').append(csv(profile != null && profile.getDepartment() != null
                            ? profile.getDepartment().getCode() : ""))
                    .append(',').append(csv(profile != null ? profile.getDesignation() : ""))
                    .append(',').append(user.isActive() ? "Yes" : "No")
                    .append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String csv(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }
}
