/**
 * Validates a flow's nodes and edges.
 * Returns { valid: boolean, errors: string[], warnings: string[], nodeIssues: Map<nodeId, {errors, warnings}> }
 */
export function validateFlow(nodes, edges) {
  const errors = [];
  const warnings = [];
  // Per-node issues map: nodeId → { errors: [], warnings: [] }
  const nodeIssues = new Map();

  const addNodeError = (nodeId, msg) => {
    if (!nodeIssues.has(nodeId)) nodeIssues.set(nodeId, { errors: [], warnings: [] });
    nodeIssues.get(nodeId).errors.push(msg);
    errors.push(msg);
  };
  const addNodeWarning = (nodeId, msg) => {
    if (!nodeIssues.has(nodeId)) nodeIssues.set(nodeId, { errors: [], warnings: [] });
    nodeIssues.get(nodeId).warnings.push(msg);
    warnings.push(msg);
  };

  if (!nodes || nodes.length === 0) {
    errors.push("Flow is empty. Add at least one block.");
    return { valid: false, errors, warnings, nodeIssues };
  }

  // Check for Input block
  const inputNodes = nodes.filter((n) => n.type === "input");
  if (inputNodes.length === 0) {
    errors.push("Missing Input Block. Every flow must start with an Input block.");
  } else if (inputNodes.length > 1) {
    inputNodes.slice(1).forEach((n) => addNodeWarning(n.id, "Extra Input Block — only the first will be used."));
  }

  // Check Input block has a label
  inputNodes.forEach((n) => {
    if (!n.config?.label?.trim()) {
      addNodeWarning(n.id, "Input Block has no label set.");
    }
  });

  // Check for Output block
  const outputNodes = nodes.filter((n) => n.type === "output");
  const conditionNodes = nodes.filter((n) => n.type === "condition");
  if (outputNodes.length === 0 && conditionNodes.length === 0) {
    warnings.push("No Output Block — last block's result will be shown.");
  } else if (outputNodes.length > 1) {
    outputNodes.slice(1).forEach((n) => addNodeWarning(n.id, "Extra Output Block — only the first reached will be used."));
  }

  // Check AI blocks
  nodes.filter((n) => n.type === "ai").forEach((n) => {
    if (!n.config?.systemPrompt?.trim()) {
      addNodeWarning(n.id, `AI Block has no system prompt — it may produce inconsistent results.`);
    }
    if (!n.config?.model) {
      addNodeWarning(n.id, "AI Block has no model selected.");
    }
  });

  // Check Action blocks
  nodes.filter((n) => n.type === "action" && n.config?.actionType === "transform").forEach((n) => {
    if (!n.config?.transformPrompt?.trim()) {
      addNodeWarning(n.id, "Action Block (AI Transform) has no transform prompt set.");
    }
  });

  // Check Condition blocks
  nodes.filter((n) => n.type === "condition").forEach((n) => {
    if (!n.config?.operator) {
      addNodeError(n.id, "Condition Block has no operator selected.");
    }
    const outEdges = (edges || []).filter((e) => e.from === n.id);
    if (outEdges.length === 0) {
      addNodeError(n.id, "Condition Block has no outgoing connections (needs true/false branches).");
    } else if (outEdges.length === 1) {
      addNodeWarning(n.id, "Condition Block only has one branch — add a second connection for the other path.");
    }
  });

  // Cycle check only if edges exist
  if (edges && edges.length > 0 && hasCycle(nodes, edges)) {
    errors.push("Flow contains a cycle. Circular connections are not allowed.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    nodeIssues,
  };
}

function hasCycle(nodes, edges) {
  const adj = {};
  nodes.forEach((n) => (adj[n.id] = []));
  edges.forEach((e) => {
    if (adj[e.from]) adj[e.from].push(e.to);
  });

  const visited = new Set();
  const inStack = new Set();

  function dfs(nodeId) {
    visited.add(nodeId);
    inStack.add(nodeId);
    for (const neighbor of adj[nodeId] || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (inStack.has(neighbor)) {
        return true;
      }
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }
  return false;
}

const TYPE_ORDER = { input: 0, ai: 1, action: 2, condition: 3, output: 4 };

/**
 * Returns nodes sorted by block type sequence: input → ai → action → condition → output.
 * If edges exist and form a valid graph, uses topological sort instead.
 */
export function getExecutionOrder(nodes, edges) {
  // If edges are provided and connect nodes, use topological sort
  if (edges && edges.length > 0) {
    const adj = {};
    const inDegree = {};
    nodes.forEach((n) => { adj[n.id] = []; inDegree[n.id] = 0; });
    edges.forEach((e) => {
      if (adj[e.from] !== undefined) {
        adj[e.from].push(e.to);
        inDegree[e.to] = (inDegree[e.to] || 0) + 1;
      }
    });
    const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
    const result = [];
    const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
    while (queue.length > 0) {
      const id = queue.shift();
      if (nodeMap[id]) result.push(nodeMap[id]);
      for (const neighbor of adj[id] || []) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) queue.push(neighbor);
      }
    }
    if (result.length === nodes.length) return result;
  }

  // Fallback: sort by block type order
  return [...nodes].sort((a, b) => {
    const ao = TYPE_ORDER[a.type] ?? 99;
    const bo = TYPE_ORDER[b.type] ?? 99;
    return ao - bo;
  });
}