package com.collego.ai;

import com.collego.entity.Role;

import java.util.Map;
import java.util.Set;
import java.util.function.BiFunction;

/**
 * Phase 10: lambda-friendly {@link AiTool} implementation used to declare the
 * tool catalog without a class per tool.
 */
public record SimpleAiTool(
        String name,
        String description,
        Set<Role> roles,
        Map<String, Object> parameters,
        BiFunction<AiScope, Map<String, Object>, Object> handler
) implements AiTool {

    @Override
    public Object execute(AiScope scope, Map<String, Object> arguments) {
        return handler.apply(scope, arguments);
    }
}
