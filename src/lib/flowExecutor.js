import { base44 } from "@/api/base44Client";

function interpolate(text, varMap) {
  if (!text || !varMap) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    varMap[key] !== undefined ? varMap[key] : `{{${key}}}`
  );
}

/** Evaluate a single operator against the pipeline */
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

/** Evaluate a condition block — supports both legacy single and new multi-condition */
function evaluateCondition(pipeline, cfg) {
  // Multi-condition format
  if (cfg.conditions && cfg.conditions.length > 0) {
    const results = cfg.conditions.map((c) => evaluateOp(pipeline, c.operator || "contains", c.conditionValue || ""));
    return cfg.logic === "or" ? results.some(Boolean) : results.every(Boolean);
  }
  // Legacy single condition
  return evaluateOp(pipeline, cfg.operator || "contains", cfg.conditionValue || "");
}

/** Validate data against a JSON schema (basic structural check) */
function validateJsonSchema(data, schemaStr, onLog) {
  if (!schemaStr?.trim()) return true;
  let schema;
  try { schema = JSON.parse(schemaStr); } catch { onLog(`[WARN] Invalid JSON schema — skipping validation.`); return true; }
  let parsed;
  try { parsed = typeof data === "string" ? JSON.parse(data) : data; } catch {
    onLog(`[ERROR] Output is not valid JSON but a schema was specified.`);
    return false;
  }
  // Check required fields
  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in parsed)) {
        onLog(`[ERROR] Schema validation failed: missing required field "${field}".`);
        return false;
      }
    }
  }
  return true;
}

/**
 * Main entry point — execute flow by running ALL blocks sequentially in order.
 * NO early exit, NO skipping — every block runs.
 */
export async function executeFlow(nodes, userInput, varMap = {}, onLog, onOutput, onNodeUpdate, meta = {}) {
  if (!nodes || nodes.length === 0) {
    onLog("[ERROR] No nodes in flow.");
    return;
  }

  const runStart = Date.now();
  let finalOutput = null;
  let runStatus = "success";
  let errorMsg = null;

  // Sort blocks by execution order: input → ai → action → output → condition
  const executionOrder = ["input", "ai", "action", "output", "condition"];
  const sortedNodes = [...nodes].sort((a, b) => {
    const aIdx = executionOrder.indexOf(a.type);
    const bIdx = executionOrder.indexOf(b.type);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  let pipeline = userInput;

  // Execute each block sequentially — NO early exits
  for (const node of sortedNodes) {
    const start = Date.now();
    onNodeUpdate?.({ id: node.id, type: node.type, label: node.label, status: "running", output: null, error: null, duration: null });

    try {
      switch (node.type) {
        case "input": {
          // Use block's value first, then userInput, then empty
          pipeline = node.config?.value || pipeline || "";
          
          // Warn if empty
          if (!pipeline || pipeline.trim() === "") {
            onLog(`[⚠️] Input block has no value — using empty string`);
          }
          
          onLog(`[${timestamp()}] Step 1: Input received — "${pipeline.slice(0, 60)}${pipeline.length > 60 ? "..." : ""}"`);
          break;
        }

        case "ai": {
          try {
            const systemPrompt = interpolate(node.config?.systemPrompt || "You are a helpful assistant.", varMap);
            const prompt = interpolate(pipeline, varMap);
            const hasSchema = !!node.config?.jsonSchema?.trim();
            onLog(`[${timestamp()}] Step 2: Calling AI (model: ${node.config?.model || "gpt-4o-mini"})...`);
            let parsedSchema = null;
            if (hasSchema) {
              try { parsedSchema = JSON.parse(node.config.jsonSchema); } catch { /* ignore */ }
            }
            const result = await base44.integrations.Core.InvokeLLM({
              prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
              response_json_schema: parsedSchema || null,
            });
            pipeline = typeof result === "string" ? result : JSON.stringify(result, null, 2);

            // Safeguard: ensure pipeline never becomes null/empty
            if (!pipeline || pipeline.trim() === "") {
              pipeline = `AI fallback: ${prompt}`;
              onLog(`[WARN] AI returned empty — using fallback.`);
            }

            onLog(`[${timestamp()}] AI responded (${pipeline.length} chars)`);
          } catch (aiErr) {
            pipeline = `AI error: ${aiErr?.message || "API failed"} — using input`;
            onLog(`[ERROR] AI block failed: ${aiErr?.message || "Unknown error"}`);
            onLog(`[${timestamp()}] Continuing with fallback.`);
          }
          break;
        }

        case "action": {
          try {
            const actionType = node.config?.actionType || "transform";
            if (actionType === "transform") {
              const fullPrompt = `${interpolate(node.config?.transformPrompt || "Summarize:", varMap)}\n\n${interpolate(pipeline, varMap)}`;
              onLog(`[${timestamp()}] Step 3: Action (transform)...`);
              const result = await base44.integrations.Core.InvokeLLM({ prompt: fullPrompt });
              pipeline = typeof result === "string" ? result : JSON.stringify(result);
              onLog(`[${timestamp()}] Transform complete.`);
            } else if (actionType === "uppercase") {
              pipeline = pipeline.toUpperCase();
              onLog(`[${timestamp()}] Step 3: Action (uppercase applied).`);
            } else if (actionType === "lowercase") {
              pipeline = pipeline.toLowerCase();
              onLog(`[${timestamp()}] Step 3: Action (lowercase applied).`);
            } else if (actionType === "trim") {
              pipeline = pipeline.trim();
              onLog(`[${timestamp()}] Step 3: Action (trim applied).`);
            }
          } catch (actErr) {
            onLog(`[ERROR] Action block failed: ${actErr?.message || "Unknown error"} — continuing.`);
          }
          break;
        }

        case "output": {
          onLog(`[${timestamp()}] Step 4: Output generated.`);
          let outputValue = pipeline;
          if (node.config?.format === "json") {
            try { outputValue = JSON.stringify(JSON.parse(pipeline), null, 2); } catch { outputValue = pipeline; }
          } else if (node.config?.format === "uppercase") {
            outputValue = pipeline.toUpperCase();
          }
          
          // Ensure output never empty
          if (!outputValue || outputValue.trim() === "") {
            outputValue = "No output generated.";
          }
          
          finalOutput = outputValue;
          onOutput(outputValue);
          break;
        }

        case "condition": {
          // Still evaluate but don't branch — just log result and continue
          const result = evaluateCondition(pipeline, node.config || {});
          onLog(`[${timestamp()}] Condition evaluation: ${result ? "TRUE ✓" : "FALSE ✗"}`);
          break;
        }

        default:
          onLog(`[${timestamp()}] Unknown block type: ${node.type}`);
      }

      onNodeUpdate?.({ id: node.id, type: node.type, label: node.label, status: "done", output: pipeline, error: null, duration: Date.now() - start });
    } catch (err) {
      const errMsg = err?.message || String(err);
      onLog(`[ERROR] Block "${node.label}" failed: ${errMsg}`);
      onNodeUpdate?.({ id: node.id, type: node.type, label: node.label, status: "error", output: null, error: errMsg, duration: Date.now() - start });
      // Continue execution — don't throw
    }
  }

  // Guarantee output
  if (finalOutput === null || finalOutput.trim() === "") {
    finalOutput = pipeline || "Flow completed with no output.";
    onOutput(finalOutput);
  }

  onLog(`[${timestamp()}] ✅ Flow execution complete.`);

  // Record analytics
  try {
    await base44.entities.FlowRun.create({
      flow_id: meta.flowId || null,
      flow_name: meta.flowName || "Unknown Flow",
      status: runStatus,
      duration_ms: Date.now() - runStart,
      node_count: sortedNodes.length,
      error_message: errorMsg || null,
      input_preview: userInput?.slice(0, 200) || "",
      output_preview: finalOutput?.slice(0, 200) || "",
    });
  } catch { /* analytics failure should not break the flow */ }
}

function timestamp() {
  return new Date().toLocaleTimeString();
}