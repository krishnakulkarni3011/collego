package com.collego.entity;

/**
 * Utility class for the 10-point Indian grading scale.
 *
 * Grade | Points | Percentage Range
 * O     | 10     | 90-100
 * A+    | 9      | 80-89
 * A     | 8      | 70-79
 * B+    | 7      | 60-69
 * B     | 6      | 55-59
 * C     | 5      | 50-54
 * P     | 4      | 40-49
 * F     | 0      | Below 40
 */
public final class Grade {

    private Grade() {
        // Utility class — no instantiation
    }

    public static String calculateGrade(double percentage) {
        if (percentage >= 90) return "O";
        if (percentage >= 80) return "A+";
        if (percentage >= 70) return "A";
        if (percentage >= 60) return "B+";
        if (percentage >= 55) return "B";
        if (percentage >= 50) return "C";
        if (percentage >= 40) return "P";
        return "F";
    }

    public static double calculateGradePoints(double percentage) {
        if (percentage >= 90) return 10.0;
        if (percentage >= 80) return 9.0;
        if (percentage >= 70) return 8.0;
        if (percentage >= 60) return 7.0;
        if (percentage >= 55) return 6.0;
        if (percentage >= 50) return 5.0;
        if (percentage >= 40) return 4.0;
        return 0.0;
    }

    public static double calculateGradePoints(String grade) {
        return switch (grade) {
            case "O" -> 10.0;
            case "A+" -> 9.0;
            case "A" -> 8.0;
            case "B+" -> 7.0;
            case "B" -> 6.0;
            case "C" -> 5.0;
            case "P" -> 4.0;
            default -> 0.0;
        };
    }
}
