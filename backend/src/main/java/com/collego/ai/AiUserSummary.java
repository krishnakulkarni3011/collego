package com.collego.ai;

import com.collego.entity.Role;
import com.collego.entity.User;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Phase 10: password-free projection of a {@link User} row.
 *
 * <p>The AI subsystem may only ever see this shape. {@link User} itself carries
 * {@code passwordHash}, {@code refreshToken} and {@code passwordResetToken}, so
 * exposing the entity to a tool or to the model is forbidden by design — per
 * decision D3 admins get full data EXCEPT stored/updated passwords.
 */
public record AiUserSummary(
        Long id,
        String email,
        String firstName,
        String lastName,
        Role role,
        boolean active
) {

    public static AiUserSummary from(User user) {
        if (user == null) return null;
        return new AiUserSummary(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole(),
                user.isActive());
    }

    public Map<String, Object> toMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", id);
        map.put("email", email);
        map.put("firstName", firstName);
        map.put("lastName", lastName);
        map.put("role", role != null ? role.name() : null);
        map.put("active", active);
        return map;
    }
}
