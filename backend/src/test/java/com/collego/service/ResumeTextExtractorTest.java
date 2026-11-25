package com.collego.service;

import com.collego.exception.BadRequestException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class ResumeTextExtractorTest {

    private final ResumeTextExtractor extractor = new ResumeTextExtractor();

    @Test
    void readsPlainTextResume() {
        String body = "Krishna Kumar\nSoftware Engineer\n"
                + "Skills: Java, Spring Boot, PostgreSQL, React\n"
                + "Projects: Built a college ERP serving 2000+ students.\n"
                + "Internship: Backend intern at Acme for 6 months.";
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.txt", "text/plain", body.getBytes(StandardCharsets.UTF_8));

        String text = extractor.extract(file);

        assertTrue(text.contains("Krishna Kumar"));
        assertTrue(text.contains("Spring Boot"));
    }

    @Test
    void readsTextFromPdf() throws Exception {
        byte[] pdf;
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 12);
                content.newLineAtOffset(50, 700);
                content.showText("Krishna Kumar - Java Spring Boot PostgreSQL React");
                content.endText();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            pdf = out.toByteArray();
        }

        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.pdf", "application/pdf", pdf);

        String text = extractor.extract(file);

        assertTrue(text.contains("Krishna Kumar"));
        assertTrue(text.contains("Spring Boot"));
    }

    @Test
    void readsTextFromDocx() throws Exception {
        byte[] docx;
        try (XWPFDocument document = new XWPFDocument()) {
            XWPFParagraph paragraph = document.createParagraph();
            paragraph.createRun().setText("Krishna Kumar - Java Spring Boot PostgreSQL React");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.write(out);
            docx = out.toByteArray();
        }

        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docx);

        String text = extractor.extract(file);

        assertTrue(text.contains("Krishna Kumar"));
        assertTrue(text.contains("PostgreSQL"));
    }

    @Test
    void rejectsEmptyFile() {
        MockMultipartFile file = new MockMultipartFile("file", "resume.txt", "text/plain", new byte[0]);
        assertThrows(BadRequestException.class, () -> extractor.extract(file));
    }

    @Test
    void rejectsFileWithoutReadableText() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.txt", "text/plain", "too short".getBytes(StandardCharsets.UTF_8));
        assertThrows(BadRequestException.class, () -> extractor.extract(file));
    }

    @Test
    void rejectsUnsupportedFileType() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.rtf", "application/rtf",
                "A long enough resume body that would otherwise pass the text check.".getBytes(StandardCharsets.UTF_8));
        assertThrows(BadRequestException.class, () -> extractor.extract(file));
    }

    @Test
    void rejectsLegacyDocWithClearMessage() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.doc", "application/msword",
                "A long enough resume body that would otherwise pass the text check.".getBytes(StandardCharsets.UTF_8));
        BadRequestException error = assertThrows(BadRequestException.class, () -> extractor.extract(file));
        assertTrue(error.getMessage().toLowerCase().contains("docx"));
    }
}
