package com.collego.util;

/**
 * Maps semester numbers to the four academic years used by the portals.
 * 1-2 = I Year, 3-4 = II Year, 5-6 = III Year, 7-8 = Final Year.
 */
public final class AcademicYearUtils {

    private AcademicYearUtils() {
    }

    public static Integer fromSemester(Integer semester) {
        if (semester == null || semester < 1 || semester > 8) {
            return null;
        }
        return (semester + 1) / 2;
    }

    public static String label(Integer year) {
        if (year == null) {
            return "All Years";
        }
        return switch (year) {
            case 1 -> "I Year";
            case 2 -> "II Year";
            case 3 -> "III Year";
            case 4 -> "Final Year";
            default -> "Unknown Year";
        };
    }
}
