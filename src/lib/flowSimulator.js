/**
 * Simulated flow executor — no external API calls.
 * Produces instant, deterministic output for each block type.
 */

function interpolate(text, varMap) {
  if (!text || !varMap) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    varMap[key] !== undefined ? varMap[key] : `{{${key}}}`
  );
}

function evaluateOp(pipeline, op, val) {
  switch (op) {
    case "contains": return pipeline.includes(val);
    case "not_contains": return !pipeline.includes(val);
    case "equals": return pipeline.trim() === val.trim();
    case "not_equals": return pipeline.trim() !== val.trim();
    case "starts_with": return pipeline.startsWith(val);
    case "ends_with": return pipeline.endsWith(val);
    case "is_json": try { JSON.parse(pipeline); return true; } catch { return false; }
    case "length_gt": return pipeline.length > parseInt(val, 10);
    case "length_lt": return pipeline.length < parseInt(val, 10);
    case "is_empty": return pipeline.trim() === "";
    case "is_not_empty": return pipeline.trim() !== "";
    default: return false;
  }
}

function evaluateCondition(pipeline, cfg) {
  if (cfg.conditions && cfg.conditions.length > 0) {
    const results = cfg.conditions.map((c) => evaluateOp(pipeline, c.operator || "contains", c.conditionValue || ""));
    return cfg.logic === "or" ? results.some(Boolean) : results.every(Boolean);
  }
  return evaluateOp(pipeline, cfg.operator || "contains", cfg.conditionValue || "");
}

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ts() {
  return new Date().toLocaleTimeString();
}

async function simulateNode(nodeMap, edges, nodeId, pipeline, varMap, onLog, onOutput, onNodeUpdate, visited = new Set()) {
  if (visited.has(nodeId)) return pipeline;
  visited.add(nodeId);

  const node = nodeMap[nodeId];
  if (!node) return pipeline;

  const start = Date.now();
  onNodeUpdate?.({ id: node.id, type: node.type, label: node.label, status: "running", output: null, error: null, duration: null });
  onLog(`[${ts()}] ▶ Step ${visited.size}: ${node.label}`);

  await delay(300); // brief pause for visual feedback

  switch (node.type) {
    case "input": {
      const value = pipeline || node.config?.placeholder || "(empty input)";
      pipeline = value;
      onLog(`[${ts()}] ✓ Step 1: Input received — "${pipeline.slice(0, 60)}${pipeline.length > 60 ? "…" : ""}"`);
      break;
    }

    case "ai": {
      const prompt = interpolate(pipeline, varMap);
      const systemPrompt = interpolate(node.config?.systemPrompt || "", varMap);
      pipeline = `AI processed: ${prompt}`;
      if (systemPrompt) {
        pipeline += `\n[System: ${systemPrompt.slice(0, 80)}]`;
      }
      onLog(`[${ts()}] ✓ Step ${visited.size}: AI processed — model: ${node.config?.model || "gpt-4o-mini"} (simulated)`);
      break;
    }

    case "action": {
      const actionType = node.config?.actionType || "transform";
      if (actionType === "transform") {
        const prompt = interpolate(node.config?.transformPrompt || "Transform:", varMap);
        pipeline = `Action executed on: ${pipeline}\n[Transform: ${prompt}]`;
      } else if (actionType === "uppercase") {
        pipeline = pipeline.toUpperCase();
      } else if (actionType === "lowercase") {
        pipeline = pipeline.toLowerCase();
      } else if (actionType === "trim") {
        pipeline = pipeline.trim();
      }
      onLog(`[${ts()}] ✓ Step ${visited.size}: Action executed — type: ${actionType}`);
      break;
    }

    case "condition": {
      const result = evaluateCondition(pipeline, node.config);
      onLog(`[${ts()}] ✓ Step ${visited.size}: Condition "${node.config?.operator}" → ${result ? "TRUE ✓" : "FALSE ✗"}`);
      onNodeUpdate?.({ id: node.id, type: node.type, label: node.label, status: "done", output: String(result), error: null, duration: Date.now() - start });

      const outEdges = edges.filter((e) => e.from === nodeId);
      const nextEdge = result ? outEdges[0] : outEdges[1];
      if (nextEdge) {
        pipeline = await simulateNode(nodeMap, edges, nextEdge.to, pipeline, varMap, onLog, onOutput, onNodeUpdate, visited);
      } else {
        onLog(`[WARN] No branch edge for ${result ? "TRUE" : "FALSE"} — stopping.`);
      }
      return pipeline;
    }

    case "output": {
      let finalOutput = pipeline;
      if (node.config?.format === "json") {
        try { finalOutput = JSON.stringify(JSON.parse(pipeline), null, 2); } catch { finalOutput = pipeline; }
      } else if (node.config?.format === "uppercase") {
        finalOutput = pipeline.toUpperCase();
      }
      onOutput(finalOutput);
      pipeline = finalOutput;
      onLog(`[${ts()}] ✓ Step ${visited.size}: Output displayed — format: ${node.config?.format || "text"}`);
      break;
    }

    default:
      onLog(`[${ts()}] Unknown block: ${node.type}`);
  }

  onNodeUpdate?.({ id: node.id, type: node.type, label: node.label, status: "done", output: pipeline, error: null, duration: Date.now() - start });

  // Follow single outgoing edge
  const nextEdge = edges.find((e) => e.from === nodeId);
  if (nextEdge) {
    pipeline = await simulateNode(nodeMap, edges, nextEdge.to, pipeline, varMap, onLog, onOutput, onNodeUpdate, visited);
  }

  return pipeline;
}

export async function simulateFlow(nodes, userInput, varMap = {}, onLog, onOutput, onNodeUpdate, meta = {}) {
  if (!nodes || nodes.length === 0) { onLog("[ERROR] No nodes in flow."); return; }

  onLog(`[${ts()}] ⚡ Simulation mode — no API calls`);
  onLog(`[${ts()}] Starting flow: "${meta.flowName || "Untitled"}"`);
  onLog(`[${ts()}] ${nodes.length} block(s) in pipeline`);

  let pipeline = userInput;
  let stepNum = 0;
  let finalOutput = null;

  for (const node of nodes) {
    stepNum++;
    const start = Date.now();
    onNodeUpdate?.({ id: node.id, type: node.type, label: node.label, status: "running", output: null, error: null, duration: null });
    await delay(300);

    switch (node.type) {
      case "input": {
        pipeline = pipeline || node.config?.placeholder || "(empty input)";
        onLog(`[${ts()}] ✓ Step ${stepNum}: Input received — "${pipeline.slice(0, 60)}${pipeline.length > 60 ? "…" : ""}"`);
        break;
      }
      case "ai": {
        pipeline = `AI processed: ${pipeline}`;
        onLog(`[${ts()}] ✓ Step ${stepNum}: AI processed (simulated)`);
        break;
      }
      case "action": {
        const actionType = node.config?.actionType || "transform";
        if (actionType === "uppercase") {
          pipeline = pipeline.toUpperCase();
        } else if (actionType === "lowercase") {
          pipeline = pipeline.toLowerCase();
        } else if (actionType === "trim") {
          pipeline = pipeline.trim();
        } else {
          pipeline = `${pipeline} → Action executed`;
        }
        onLog(`[${ts()}] ✓ Step ${stepNum}: Action executed — type: ${actionType}`);
        break;
      }
      case "condition": {
        const op = node.config?.operator || "contains";
        const val = node.config?.conditionValue || "";
        const result = pipeline.includes(val);
        onLog(`[${ts()}] ✓ Step ${stepNum}: Condition "${op}" → ${result ? "TRUE ✓" : "FALSE ✗"}`);
        onNodeUpdate?.({ id: node.id, type: node.type, label: node.label, status: "done", output: String(result), error: null, duration: Date.now() - start });
        continue;
      }
      case "output": {
        let out = pipeline;
        if (node.config?.format === "json") {
          try { out = JSON.stringify(JSON.parse(pipeline), null, 2); } catch { out = pipeline; }
        } else if (node.config?.format === "uppercase") {
          out = pipeline.toUpperCase();
        }
        finalOutput = out;
        onOutput(out);
        onLog(`[${ts()}] ✓ Step ${stepNum}: Output displayed`);
        break;
      }
      default:
        onLog(`[${ts()}] Unknown block: ${node.type}`);
    }

    onNodeUpdate?.({ id: node.id, type: node.type, label: node.label, status: "done", output: pipeline, error: null, duration: Date.now() - start });
  }

  if (finalOutput === null) {
    onLog(`[${ts()}] No Output block — showing last pipeline value.`);
    onOutput(pipeline);
  }

  onLog(`[${ts()}] ✅ Flow execution complete.`);
}