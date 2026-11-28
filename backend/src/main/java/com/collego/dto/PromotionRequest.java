package com.collego.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class PromotionRequest {
    private Long fromSemesterId;
    private Long toSemesterId;
    private String academicYear;
    /** Students the admin explicitly wants to hold back; everyone else is promoted/graduated. */
    private List<Long> heldBackStudentIds;
    /** Optional per-student notes, keyed by student id. */
    private Map<Long, String> notes;
}
