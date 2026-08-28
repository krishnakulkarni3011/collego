package com.collego.service;

import com.collego.dto.CgpaResponse;
import com.collego.dto.SgpaResponse;
import com.collego.dto.SemesterMarksResponse;
import com.collego.entity.*;
import com.collego.exception.ResourceNotFoundException;
import com.collego.repository.*;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarksheetService {

    private final StudentPortalService studentPortalService;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SemesterRepository semesterRepository;

    // Font definitions
    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 16, Font.BOLD, new Color(0, 51, 102));
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(0, 51, 102));
    private static final Font HEADER_FONT = new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE);
    private static final Font BODY_FONT = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.BLACK);
    private static final Font BODY_BOLD_FONT = new Font(Font.HELVETICA, 9, Font.BOLD, Color.BLACK);
    private static final Font SMALL_FONT = new Font(Font.HELVETICA, 8, Font.NORMAL, Color.DARK_GRAY);
    private static final Font LABEL_FONT = new Font(Font.HELVETICA, 9, Font.BOLD, new Color(0, 51, 102));

    public byte[] generateMarksheet(String email, Long semesterId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
        StudentProfile student = studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        Semester semester = semesterRepository.findById(semesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found with id: " + semesterId));

        CgpaResponse cgpaData = studentPortalService.calculateCgpa(email);

        // Find SGPA for the requested semester
        SgpaResponse semesterData = cgpaData.getSemesters().stream()
                .filter(s -> s.getSemesterId().equals(semesterId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("No marks found for semester: " + semester.getName()));

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter.getInstance(document, baos);
            document.open();

            // Header
            addHeader(document, student, semester);

            // Student Info
            addStudentInfo(document, student, user, semester);

            // Marks Table
            addMarksTable(document, semesterData);

            // Summary
            addSummary(document, semesterData, cgpaData);

            // Grade Legend
            addGradeLegend(document);

            // Footer
            addFooter(document);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Error generating marksheet PDF", e);
            throw new RuntimeException("Failed to generate marksheet PDF", e);
        }
    }

    public byte[] generateTranscript(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
        StudentProfile student = studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        CgpaResponse cgpaData = studentPortalService.calculateCgpa(email);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter.getInstance(document, baos);
            document.open();

            // Title
            Paragraph title = new Paragraph("OFFICIAL ACADEMIC TRANSCRIPT", TITLE_FONT);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph collegeName = new Paragraph("COLLEGO INSTITUTE OF TECHNOLOGY", SUBTITLE_FONT);
            collegeName.setAlignment(Element.ALIGN_CENTER);
            document.add(collegeName);
            document.add(new Paragraph(" "));

            // Student Info
            addStudentInfo(document, student, user, null);

            // All Semesters
            for (SgpaResponse semData : cgpaData.getSemesters()) {
                document.add(new Paragraph(" "));
                Paragraph semTitle = new Paragraph(
                        semData.getSemesterName() + " (" + semData.getAcademicYear() + ")", SUBTITLE_FONT);
                document.add(semTitle);
                addMarksTable(document, semData);
                addSgpaLine(document, semData);
            }

            // Cumulative CGPA
            document.add(new Paragraph(" "));
            Paragraph cgpaLine = new Paragraph(
                    "Cumulative CGPA: " + cgpaData.getCumulativeCgpa() +
                    " | Total Credits: " + (int) cgpaData.getTotalCreditsAllSemesters(), BODY_BOLD_FONT);
            cgpaLine.setAlignment(Element.ALIGN_RIGHT);
            document.add(cgpaLine);

            // Grade Legend
            document.add(new Paragraph(" "));
            addGradeLegend(document);

            // Footer
            addFooter(document);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Error generating transcript PDF", e);
            throw new RuntimeException("Failed to generate transcript PDF", e);
        }
    }

    // ==================== PDF Building Helpers ====================

    private void addHeader(Document document, StudentProfile student, Semester semester) throws DocumentException {
        Paragraph collegeName = new Paragraph("COLLEGO INSTITUTE OF TECHNOLOGY", TITLE_FONT);
        collegeName.setAlignment(Element.ALIGN_CENTER);
        document.add(collegeName);

        Paragraph subtitle = new Paragraph("STATEMENT OF MARKS", SUBTITLE_FONT);
        subtitle.setAlignment(Element.ALIGN_CENTER);
        document.add(subtitle);

        Paragraph semesterInfo = new Paragraph(
                semester.getName() + " — Academic Year " + semester.getAcademicYear(), BODY_FONT);
        semesterInfo.setAlignment(Element.ALIGN_CENTER);
        document.add(semesterInfo);

        document.add(new Paragraph(" "));
    }

    private void addStudentInfo(Document document, StudentProfile student, User user, Semester semester) throws DocumentException {
        PdfPTable infoTable = new PdfPTable(4);
        infoTable.setWidthPercentage(100);
        infoTable.setWidths(new float[]{1.5f, 3f, 1.5f, 3f});

        addInfoCell(infoTable, "Name:", user.getFirstName() + " " + user.getLastName());
        addInfoCell(infoTable, "Enrollment No.:", student.getEnrollmentNumber() != null ? student.getEnrollmentNumber() : "N/A");
        addInfoCell(infoTable, "Department:", student.getDepartment() != null ? student.getDepartment().getName() : "N/A");
        addInfoCell(infoTable, "Section:", student.getSection() != null ? student.getSection() : "N/A");
        if (semester != null) {
            addInfoCell(infoTable, "Semester:", semester.getName());
            addInfoCell(infoTable, "Academic Year:", semester.getAcademicYear());
        }

        document.add(infoTable);
        document.add(new Paragraph(" "));
    }

    private void addInfoCell(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, LABEL_FONT));
        labelCell.setBorder(PdfPCell.NO_BORDER);
        labelCell.setPadding(3);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, BODY_FONT));
        valueCell.setBorder(PdfPCell.NO_BORDER);
        valueCell.setPadding(3);
        table.addCell(valueCell);
    }

    private void addMarksTable(Document document, SgpaResponse semesterData) throws DocumentException {
        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{0.5f, 1.2f, 3f, 0.8f, 1f, 0.8f, 0.8f});

        // Header row
        Color headerBg = new Color(0, 51, 102);
        addHeaderCell(table, "Sl.", headerBg);
        addHeaderCell(table, "Code", headerBg);
        addHeaderCell(table, "Subject", headerBg);
        addHeaderCell(table, "Credits", headerBg);
        addHeaderCell(table, "Marks", headerBg);
        addHeaderCell(table, "Grade", headerBg);
        addHeaderCell(table, "GP", headerBg);

        // Data rows
        int slNo = 1;
        double totalCredits = 0;
        double totalMarks = 0;
        double totalMaxMarks = 0;

        for (SemesterMarksResponse subject : semesterData.getSubjects()) {
            Color rowBg = (slNo % 2 == 0) ? new Color(240, 245, 250) : Color.WHITE;

            addDataCell(table, String.valueOf(slNo++), rowBg, Element.ALIGN_CENTER);
            addDataCell(table, subject.getCourseCode(), rowBg, Element.ALIGN_LEFT);
            addDataCell(table, subject.getCourseName(), rowBg, Element.ALIGN_LEFT);
            addDataCell(table, String.valueOf(subject.getCredits()), rowBg, Element.ALIGN_CENTER);

            String marksStr = subject.getObtainedMarks() != null
                    ? String.format("%.0f/%.0f", subject.getObtainedMarks(), subject.getMaxMarks())
                    : "-";
            addDataCell(table, marksStr, rowBg, Element.ALIGN_CENTER);

            addDataCell(table, subject.getGrade() != null ? subject.getGrade() : "-", rowBg, Element.ALIGN_CENTER);
            addDataCell(table, subject.getGradePoints() != null ? String.format("%.1f", subject.getGradePoints()) : "-", rowBg, Element.ALIGN_CENTER);

            if (subject.getCredits() != null) totalCredits += subject.getCredits();
            if (subject.getObtainedMarks() != null) totalMarks += subject.getObtainedMarks();
            if (subject.getMaxMarks() != null) totalMaxMarks += subject.getMaxMarks();
        }

        // Total row
        Color totalBg = new Color(220, 230, 240);
        addDataCellBold(table, "", totalBg, Element.ALIGN_CENTER);
        addDataCellBold(table, "", totalBg, Element.ALIGN_LEFT);
        addDataCellBold(table, "TOTAL", totalBg, Element.ALIGN_RIGHT);
        addDataCellBold(table, String.valueOf((int) totalCredits), totalBg, Element.ALIGN_CENTER);
        addDataCellBold(table, String.format("%.0f/%.0f", totalMarks, totalMaxMarks), totalBg, Element.ALIGN_CENTER);
        addDataCellBold(table, "", totalBg, Element.ALIGN_CENTER);
        addDataCellBold(table, "", totalBg, Element.ALIGN_CENTER);

        document.add(table);
    }

    private void addSummary(Document document, SgpaResponse semesterData, CgpaResponse cgpaData) throws DocumentException {
        document.add(new Paragraph(" "));

        PdfPTable summaryTable = new PdfPTable(2);
        summaryTable.setWidthPercentage(50);
        summaryTable.setHorizontalAlignment(Element.ALIGN_RIGHT);

        addSummaryRow(summaryTable, "SGPA", String.format("%.2f", semesterData.getSgpa()));
        addSummaryRow(summaryTable, "CGPA", String.format("%.2f", cgpaData.getCumulativeCgpa()));

        document.add(summaryTable);
    }

    private void addSgpaLine(Document document, SgpaResponse semesterData) throws DocumentException {
        Paragraph sgpa = new Paragraph(
                "SGPA: " + String.format("%.2f", semesterData.getSgpa()) +
                " | Credits: " + (int) semesterData.getTotalCredits(), BODY_BOLD_FONT);
        sgpa.setAlignment(Element.ALIGN_RIGHT);
        document.add(sgpa);
    }

    private void addSummaryRow(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, BODY_BOLD_FONT));
        labelCell.setBackgroundColor(new Color(240, 245, 250));
        labelCell.setPadding(5);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, BODY_BOLD_FONT));
        valueCell.setBackgroundColor(new Color(240, 245, 250));
        valueCell.setPadding(5);
        valueCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(valueCell);
    }

    private void addGradeLegend(Document document) throws DocumentException {
        Paragraph legendTitle = new Paragraph("Grade Legend", LABEL_FONT);
        document.add(legendTitle);

        PdfPTable legendTable = new PdfPTable(8);
        legendTable.setWidthPercentage(100);

        String[][] grades = {
                {"O", "10"}, {"A+", "9"}, {"A", "8"}, {"B+", "7"},
                {"B", "6"}, {"C", "5"}, {"P", "4"}, {"F", "0"}
        };

        // Headers
        for (String[] grade : grades) {
            PdfPCell cell = new PdfPCell(new Phrase(grade[0], BODY_BOLD_FONT));
            cell.setBackgroundColor(new Color(0, 51, 102));
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setPadding(3);
            Phrase phrase = new Phrase(grade[0], new Font(Font.HELVETICA, 8, Font.BOLD, Color.WHITE));
            cell.setPhrase(phrase);
            legendTable.addCell(cell);
        }

        // Points
        for (String[] grade : grades) {
            PdfPCell cell = new PdfPCell(new Phrase(grade[1], SMALL_FONT));
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setPadding(3);
            cell.setBackgroundColor(new Color(240, 245, 250));
            legendTable.addCell(cell);
        }

        document.add(legendTable);
    }

    private void addFooter(Document document) throws DocumentException {
        document.add(new Paragraph(" "));
        document.add(new Paragraph(" "));

        PdfPTable footerTable = new PdfPTable(3);
        footerTable.setWidthPercentage(100);

        String dateStr = "Date: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));

        PdfPCell dateCell = new PdfPCell(new Phrase(dateStr, SMALL_FONT));
        dateCell.setBorder(PdfPCell.NO_BORDER);
        dateCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        footerTable.addCell(dateCell);

        PdfPCell hodCell = new PdfPCell(new Phrase("Head of Department\n\n_______________", SMALL_FONT));
        hodCell.setBorder(PdfPCell.NO_BORDER);
        hodCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        footerTable.addCell(hodCell);

        PdfPCell coeCell = new PdfPCell(new Phrase("Controller of Examinations\n\n_______________", SMALL_FONT));
        coeCell.setBorder(PdfPCell.NO_BORDER);
        coeCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        footerTable.addCell(coeCell);

        document.add(footerTable);
    }

    // ==================== Cell Helpers ====================

    private void addHeaderCell(PdfPTable table, String text, Color bgColor) {
        PdfPCell cell = new PdfPCell(new Phrase(text, HEADER_FONT));
        cell.setBackgroundColor(bgColor);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setPadding(5);
        table.addCell(cell);
    }

    private void addDataCell(PdfPTable table, String text, Color bgColor, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, BODY_FONT));
        cell.setBackgroundColor(bgColor);
        cell.setHorizontalAlignment(alignment);
        cell.setPadding(4);
        table.addCell(cell);
    }

    private void addDataCellBold(PdfPTable table, String text, Color bgColor, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, BODY_BOLD_FONT));
        cell.setBackgroundColor(bgColor);
        cell.setHorizontalAlignment(alignment);
        cell.setPadding(4);
        table.addCell(cell);
    }
}
