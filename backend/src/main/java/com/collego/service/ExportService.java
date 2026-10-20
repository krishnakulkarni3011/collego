package com.collego.service;

import com.collego.entity.Fee;
import com.collego.entity.FacultyProfile;
import com.collego.entity.StudentProfile;
import com.collego.entity.User;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.FeeRepository;
import com.collego.repository.StudentProfileRepository;
import com.collego.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
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
    private final FeeRepository feeRepository;

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

    public byte[] feesCsv() {
        StringBuilder sb = new StringBuilder();
        sb.append("Student ID,USN,Name,Semester,Total,Paid,Balance,Status,Due Date\n");
        List<Fee> fees = feeRepository.findAll();

        for (Fee fee : fees) {
            User user = fee.getStudent().getUser();
            BigDecimal total = fee.getTotalAmount() != null ? fee.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal paid = fee.getPaidAmount() != null ? fee.getPaidAmount() : BigDecimal.ZERO;
            sb.append(fee.getStudent().getId())
                    .append(',').append(csv(fee.getStudent().getEnrollmentNumber()))
                    .append(',').append(csv(user.getFirstName() + " " + user.getLastName()))
                    .append(',').append(csv(fee.getSemester() != null ? fee.getSemester().getName() : ""))
                    .append(',').append(total)
                    .append(',').append(paid)
                    .append(',').append(total.subtract(paid))
                    .append(',').append(fee.getStatus() != null ? fee.getStatus().name() : "")
                    .append(',').append(fee.getDueDate() != null ? fee.getDueDate() : "")
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
