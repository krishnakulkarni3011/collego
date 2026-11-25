package com.collego.service;

import com.collego.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Extracts plain text from an uploaded resume so the AI service can analyse it.
 * The uploaded file is never stored; only the extracted text is sent onward.
 *
 * Supported: text-based PDF, DOCX, TXT and MD. Scanned/image-only PDFs have no
 * text layer and are rejected with a clear message.
 */
@Service
@Slf4j
@SuppressWarnings("null")
public class ResumeTextExtractor {

    public static final long MAX_FILE_BYTES = 10L * 1024 * 1024; // 10 MB
    public static final int MAX_TEXT_CHARS = 12_000;
    private static final int MIN_TEXT_CHARS = 30;

    public String extract(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Choose a resume file to analyse.");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new BadRequestException("Resume file is too large. The maximum size is 10 MB.");
        }

        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
        String lower = fileName.toLowerCase(Locale.ROOT);
        String text;

        try {
            if (lower.endsWith(".pdf")) {
                text = extractPdf(file);
            } else if (lower.endsWith(".docx")) {
                text = extractDocx(file);
            } else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
                text = new String(file.getBytes(), StandardCharsets.UTF_8);
            } else if (lower.endsWith(".doc")) {
                throw new BadRequestException("Older .doc files are not supported. Save the resume as PDF or DOCX and upload again.");
            } else {
                throw new BadRequestException("Unsupported file type. Upload a PDF, DOCX or TXT resume.");
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (InvalidPasswordException e) {
            throw new BadRequestException("This PDF is password-protected. Remove the password and upload it again.");
        } catch (Exception e) {
            log.warn("Could not extract resume text from {}: {}", fileName, e.getMessage());
            throw new BadRequestException("We could not read this file. Upload a valid PDF, DOCX or TXT resume.");
        }

        String cleaned = normalise(text);
        if (cleaned.length() < MIN_TEXT_CHARS) {
            throw new BadRequestException(
                    "We could not find readable text in this file. If it is a scanned PDF or an image, " +
                    "upload a text-based PDF, DOCX or TXT resume instead.");
        }
        return cleaned.length() > MAX_TEXT_CHARS ? cleaned.substring(0, MAX_TEXT_CHARS) : cleaned;
    }

    private String extractPdf(MultipartFile file) throws Exception {
        try (PDDocument document = PDDocument.load(file.getBytes())) {
            if (document.isEncrypted()) {
                throw new BadRequestException("This PDF is password-protected. Remove the password and upload it again.");
            }
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(document);
        }
    }

    private String extractDocx(MultipartFile file) throws Exception {
        try (InputStream in = file.getInputStream();
             XWPFDocument document = new XWPFDocument(in);
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }

    private String normalise(String text) {
        if (text == null) return "";
        return text
                .replace('\u0000', ' ')
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replaceAll("[ \\t]+", " ")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }
}
