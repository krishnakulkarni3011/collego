package com.collego.ai;

import com.collego.entity.Role;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Phase 10: the set of tools the model may ask for, filtered by role.
 *
 * <p>Descriptors are filtered twice: when they are advertised to the model
 * ({@link #descriptors(Role)}) and again when a tool call is resolved
 * ({@link #require(String, Role)}). If a model hallucinates a tool name, or a
 * tool that exists but is not valid for the caller's role, execution is denied.
 */
@Component
public class AiToolRegistry {

    private final Map<String, AiTool> tools;

    public AiToolRegistry(AiToolCatalog catalog) {
        Map<String, AiTool> registered = new LinkedHashMap<>();
        for (AiTool tool : catalog.tools()) {
            registered.put(tool.name(), tool);
        }
        this.tools = Map.copyOf(registered);
    }

    public List<AiTool> all() {
        return List.copyOf(tools.values());
    }

    /** Tool descriptors visible to the given role. */
    public List<Map<String, Object>> descriptors(Role role) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (AiTool tool : tools.values()) {
            if (tool.supports(role)) out.add(tool.descriptor());
        }
        return out;
    }

    /**
     * Resolves a tool for execution.
     *
     * @throws AiAccessDeniedException when the tool is unknown or not permitted
     *                                 for the caller's role
     */
    public AiTool require(String name, Role role) {
        AiTool tool = tools.get(name);
        if (tool == null) {
            throw new AiAccessDeniedException("Unknown AI tool requested: " + name);
        }
        if (!tool.supports(role)) {
            throw new AiAccessDeniedException("AI tool " + name + " is not available for this role");
        }
        return tool;
    }

    public boolean contains(String name) {
        return tools.containsKey(name);
    }

    public int size() {
        return tools.size();
    }
}
