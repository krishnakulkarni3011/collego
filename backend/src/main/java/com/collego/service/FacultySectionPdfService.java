package com.collego.service;

import com.collego.entity.*;
import com.collego.exception.ResourceNotFoundException;
import com.collego.exception.BadRequestException;
import com.collego.repository.EnrollmentRepository;
import com.collego.repository.FacultyProfileRepository;
import com.collego.repository.SectionRepository;
import com.collego.util.AcademicYearUtils;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

/**
 * Generates the downloadable student roster for one teaching section.
 * Access is restricted to the faculty member who owns the section.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class FacultySectionPdfService {

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 15, Font.BOLD, new Color(0, 51, 102));
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(51, 65, 85));
    private static final Font HEADER_FONT = new Font(Font.HELVETICA, 7.5f, Font.BOLD, Color.WHITE);
    private static final Font BODY_FONT = new Font(Font.HELVETICA, 7.2f, Font.NORMAL, Color.BLACK);
    private static final Font BODY_BOLD_FONT = new Font(Font.HELVETICA, 7.2f, Font.BOLD, Color.BLACK);
    private static final Font SMALL_FONT = new Font(Font.HELVETICA, 7f, Font.NORMAL, Color.DARK_GRAY);

    private final FacultyProfileRepository facultyProfileRepository;
    private final SectionRepository sectionRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Transactional(readOnly = true)
    public byte[] generateSectionStudentsPdf(String facultyEmail, Long sectionId) {
        FacultyProfile faculty = facultyProfileRepository.findByUserEmailIgnoreCase(facultyEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty profile not found for " + facultyEmail));

        com.collego.entity.Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionId));

        if (section.getFaculty() == null || !section.getFaculty().getId().equals(faculty.getId())) {
            throw new BadRequestException("You are not assigned to section: " + section.getName());
        }

        List<Enrollment> enrollments = enrollmentRepository.findBySectionId(sectionId).stream()
                .sorted(Comparator.comparing(e -> e.getStudent().getEnrollmentNumber() == null
                        ? "" : e.getStudent().getEnrollmentNumber()))
                .toList();

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 24, 24, 24, 24);
            PdfWriter.getInstance(document, baos);
            document.open();

            addHeader(document, section, faculty);
            addStudentTable(document, section, enrollments);
            addFooter(document, faculty);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate student details PDF for section {}", sectionId, e);
            throw new RuntimeException("Failed to generate student details PDF", e);
        }
    }

    private void addHeader(Document document, com.collego.entity.Section section, FacultyProfile faculty)
            throws DocumentException {
        Paragraph college = new Paragraph("COLLEGO INSTITUTE OF TECHNOLOGY", TITLE_FONT);
        college.setAlignment(Element.ALIGN_CENTER);
        document.add(college);

        Paragraph title = new Paragraph("STUDENT DETAILS", new Font(Font.HELVETICA, 11, Font.BOLD,
                new Color(0, 51, 102)));
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);

        Course course = section.getCourse();
        Semester semester = section.getSemester();
        Department department = course != null ? course.getDepartment() : null;
        String courseLabel = course != null
                ? course.getName() + " (" + course.getCode() + ")" : "Course";
        String departmentLabel = department != null
                ? department.getName() + " (" + department.getCode() + ")" : "Department";
        String semesterLabel = semester != null
                ? semester.getName() + " | " + semester.getAcademicYear() : "";
        String facultyLabel = faculty.getUser() != null
                ? faculty.getUser().getFirstName() + " " + faculty.getUser().getLastName() : "";

        Paragraph meta = new Paragraph(
                courseLabel + "  |  Section " + section.getName() + "  |  " + semesterLabel
                        + "  |  " + departmentLabel,
                SUBTITLE_FONT);
        meta.setAlignment(Element.ALIGN_CENTER);
        document.add(meta);

        Paragraph facultyLine = new Paragraph("Faculty: " + facultyLabel, SMALL_FONT);
        facultyLine.setAlignment(Element.ALIGN_CENTER);
        document.add(facultyLine);

        document.add(new Paragraph(" "));
    }

    private void addStudentTable(Document document, com.collego.entity.Section section,
                                 List<Enrollment> enrollments) throws DocumentException {
        PdfPTable table = new PdfPTable(11);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{0.45f, 1.15f, 2.1f, 2.2f, 1.15f, 1.25f, 0.9f, 0.65f, 0.65f, 0.9f, 0.55f});
        table.setHeaderRows(1);

        Color headerBg = new Color(0, 51, 102);
        addHeaderCell(table, "Sl.", headerBg);
        addHeaderCell(table, "Enrollment No.", headerBg);
        addHeaderCell(table, "Student Name", headerBg);
        addHeaderCell(table, "Email", headerBg);
        addHeaderCell(table, "Phone", headerBg);
        addHeaderCell(table, "Department", headerBg);
        addHeaderCell(table, "Semester", headerBg);
        addHeaderCell(table, "Year", headerBg);
        addHeaderCell(table, "Section", headerBg);
        addHeaderCell(table, "Admission Year", headerBg);
        addHeaderCell(table, "CR", headerBg);

        if (enrollments.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No students are enrolled in this section.", BODY_FONT));
            empty.setColspan(11);
            empty.setHorizontalAlignment(Element.ALIGN_CENTER);
            empty.setPadding(10);
            table.addCell(empty);
            document.add(table);
            return;
        }

        int index = 1;
        for (Enrollment enrollment : enrollments) {
            StudentProfile student = enrollment.getStudent();
            User user = student.getUser();
            Color rowBg = index % 2 == 0 ? new Color(240, 245, 250) : Color.WHITE;
            String department = student.getDepartment() != null
                    ? student.getDepartment().getCode()
                    : (section.getCourse() != null && section.getCourse().getDepartment() != null
                            ? section.getCourse().getDepartment().getCode() : "-");
            Integer year = AcademicYearUtils.fromSemester(student.getSemester());
            if (year == null && section.getSemester() != null) {
                year = AcademicYearUtils.fromSemester(section.getSemester().getNumber());
            }

            addDataCell(table, String.valueOf(index++), rowBg, Element.ALIGN_CENTER, false);
            addDataCell(table, value(student.getEnrollmentNumber()), rowBg, Element.ALIGN_LEFT, false);
            addDataCell(table, value(user.getFirstName() + " " + user.getLastName()), rowBg, Element.ALIGN_LEFT, true);
            addDataCell(table, value(user.getEmail()), rowBg, Element.ALIGN_LEFT, false);
            addDataCell(table, value(user.getPhone()), rowBg, Element.ALIGN_LEFT, false);
            addDataCell(table, value(department), rowBg, Element.ALIGN_CENTER, false);
            addDataCell(table, student.getSemester() != null ? String.valueOf(student.getSemester()) : "-",
                    rowBg, Element.ALIGN_CENTER, false);
            addDataCell(table, year != null ? AcademicYearUtils.label(year) : "-",
                    rowBg, Element.ALIGN_CENTER, false);
            addDataCell(table, value(student.getSection() != null ? student.getSection() : section.getName()),
                    rowBg, Element.ALIGN_CENTER, false);
            addDataCell(table, student.getAdmissionYear() != null ? String.valueOf(student.getAdmissionYear()) : "-",
                    rowBg, Element.ALIGN_CENTER, false);
            addDataCell(table, Boolean.TRUE.equals(student.getIsCr()) ? "Yes" : "No",
                    rowBg, Element.ALIGN_CENTER, false);
        }

        document.add(table);
    }

    private void addFooter(Document document, FacultyProfile faculty) throws DocumentException {
        document.add(new Paragraph(" "));
        String generatedBy = faculty.getUser() != null
                ? faculty.getUser().getFirstName() + " " + faculty.getUser().getLastName() : "Faculty";
        Paragraph footer = new Paragraph(
                "Generated on " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy"))
                        + " by " + generatedBy,
                SMALL_FONT);
        footer.setAlignment(Element.ALIGN_RIGHT);
        document.add(footer);
    }

    private void addHeaderCell(PdfPTable table, String text, Color background) {
        PdfPCell cell = new PdfPCell(new Phrase(text, HEADER_FONT));
        cell.setBackgroundColor(background);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(4);
        table.addCell(cell);
    }

    private void addDataCell(PdfPTable table, String text, Color background, int alignment, boolean bold) {
        PdfPCell cell = new PdfPCell(new Phrase(text, bold ? BODY_BOLD_FONT : BODY_FONT));
        cell.setBackgroundColor(background);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(3.5f);
        table.addCell(cell);
    }

    private String value(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
