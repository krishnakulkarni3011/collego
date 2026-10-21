package com.collego.ai;

import com.collego.dto.CourseMaterialResponse;
import com.collego.dto.NotificationResponse;
import com.collego.dto.PlacementNoticeResponse;
import com.collego.dto.QuestionPaperResponse;
import com.collego.service.AiService;
import com.collego.service.StudentPortalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Phase 10 (Phase 5 of the rollout): scoped retrieval-augmented search over the
 * caller's own study material.
 *
 * <p>The candidate document set is built exclusively from scope-resolved service
 * calls that take the caller's own email (course materials, question papers,
 * notifications, placement notices), so retrieval can never surface another
 * user's document. Ranking uses local Ollama embeddings when available and
 * falls back to keyword overlap when the model is offline, so the tool always
 * degrades gracefully.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiRagService {

    private static final int MAX_CANDIDATES = 60;
    private static final int MAX_DOC_CHARS = 500;
    private static final long EMBEDDING_BACKOFF_MILLIS = 60_000L;

    private final StudentPortalService studentPortalService;
    private final AiService aiService;

    /** Set when embeddings are unavailable, so a dead model never stalls each turn. */
    private volatile long embeddingsDisabledUntil = 0L;

    public List<String> retrieve(AiScope scope, String query, int topK) {
        if (scope == null || !scope.isStudent() || query == null || query.isBlank()) {
            return List.of();
        }
        List<String> documents = candidateDocuments(scope.email());
        if (documents.isEmpty()) return List.of();

        List<String> ranked = rankByEmbeddings(documents, query, topK);
        return ranked != null ? ranked : rankByKeywords(documents, query, topK);
    }

    /**
     * @return the ranked documents, or null when embeddings are unavailable so the
     *         caller falls back to keyword ranking
     */
    private List<String> rankByEmbeddings(List<String> documents, String query, int topK) {
        if (System.currentTimeMillis() < embeddingsDisabledUntil) return null;

        List<List<Double>> queryEmbedding = aiService.embed(List.of(query));
        if (queryEmbedding.isEmpty() || queryEmbedding.get(0).isEmpty()) {
            disableEmbeddings();
            return null;
        }
        List<List<Double>> documentEmbeddings = aiService.embed(documents);
        if (documentEmbeddings.size() != documents.size()) {
            disableEmbeddings();
            return null;
        }
        return rankByEmbedding(documents, documentEmbeddings, queryEmbedding.get(0), topK);
    }

    private void disableEmbeddings() {
        embeddingsDisabledUntil = System.currentTimeMillis() + EMBEDDING_BACKOFF_MILLIS;
        log.debug("Embedding model unavailable; using keyword ranking for {} ms", EMBEDDING_BACKOFF_MILLIS);
    }

    private List<String> candidateDocuments(String email) {
        Set<String> documents = new LinkedHashSet<>();

        try {
            for (CourseMaterialResponse material : studentPortalService.getMaterialsForStudent(email)) {
                documents.add(trim("Course material — " + material.getCourseName()
                        + " (" + material.getCourseCode() + "): " + material.getTitle()
                        + (material.getDescription() != null ? ". " + material.getDescription() : "")));
            }
        } catch (Exception e) {
            log.debug("Material candidates unavailable: {}", e.getMessage());
        }

        try {
            for (QuestionPaperResponse paper : studentPortalService.getQuestionPapers(email)) {
                documents.add(trim("Question paper — " + paper.getCourseName()
                        + " (" + paper.getCourseCode() + "), " + paper.getExamType()
                        + " " + paper.getYear()));
            }
        } catch (Exception e) {
            log.debug("Question paper candidates unavailable: {}", e.getMessage());
        }

        try {
            for (NotificationResponse notification : studentPortalService.getNotifications(email)) {
                documents.add(trim("Notification — " + notification.getTitle()
                        + (notification.getMessage() != null ? ": " + notification.getMessage() : "")));
            }
        } catch (Exception e) {
            log.debug("Notification candidates unavailable: {}", e.getMessage());
        }

        try {
            for (PlacementNoticeResponse notice : studentPortalService.getPlacementNotices(email)) {
                documents.add(trim("Placement — " + notice.getCompanyName() + ": " + notice.getTitle()
                        + (notice.getDescription() != null ? ". " + notice.getDescription() : "")));
            }
        } catch (Exception e) {
            log.debug("Placement candidates unavailable: {}", e.getMessage());
        }

        List<String> list = new ArrayList<>(documents);
        return list.size() > MAX_CANDIDATES ? new ArrayList<>(list.subList(0, MAX_CANDIDATES)) : list;
    }

    private List<String> rankByEmbedding(List<String> documents, List<List<Double>> docEmbeddings,
                                         List<Double> queryEmbedding, int topK) {
        List<int[]> scored = new ArrayList<>();
        for (int i = 0; i < documents.size(); i++) {
            double score = cosine(queryEmbedding, docEmbeddings.get(i));
            scored.add(new int[]{i, (int) Math.round(score * 1_000_000)});
        }
        scored.sort((a, b) -> Integer.compare(b[1], a[1]));

        List<String> out = new ArrayList<>();
        for (int i = 0; i < scored.size() && out.size() < Math.max(1, topK); i++) {
            out.add(documents.get(scored.get(i)[0]));
        }
        return out;
    }

    private List<String> rankByKeywords(List<String> documents, String query, int topK) {
        String[] tokens = query.toLowerCase(Locale.ROOT).split("[^a-z0-9]+");
        List<int[]> scored = new ArrayList<>();
        for (int i = 0; i < documents.size(); i++) {
            String doc = documents.get(i).toLowerCase(Locale.ROOT);
            int score = 0;
            for (String token : tokens) {
                if (token.length() >= 3 && doc.contains(token)) score++;
            }
            scored.add(new int[]{i, score});
        }
        scored.sort((a, b) -> Integer.compare(b[1], a[1]));

        List<String> out = new ArrayList<>();
        for (int i = 0; i < scored.size() && out.size() < Math.max(1, topK); i++) {
            if (scored.get(i)[1] == 0) break;
            out.add(documents.get(scored.get(i)[0]));
        }
        return out;
    }

    private static double cosine(List<Double> a, List<Double> b) {
        if (a == null || b == null || a.isEmpty() || b.isEmpty()) return 0.0;
        int n = Math.min(a.size(), b.size());
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < n; i++) {
            double x = a.get(i) == null ? 0 : a.get(i);
            double y = b.get(i) == null ? 0 : b.get(i);
            dot += x * y;
            normA += x * x;
            normB += y * y;
        }
        if (normA == 0 || normB == 0) return 0.0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private static String trim(String text) {
        if (text == null) return "";
        return text.length() > MAX_DOC_CHARS ? text.substring(0, MAX_DOC_CHARS) : text;
    }
}
