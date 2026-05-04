import { createContext, useContext, useState, useCallback } from "react";

const FlowContext = createContext(null);

let nodeIdCounter = 1;

export const BLOCK_TYPES = {
  input: {
    id: "input",
    label: "Input Block",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/40",
    bgColor: "bg-emerald-500/10",
    defaultConfig: { label: "User Input", placeholder: "Enter your input..." },
  },
  ai: {
    id: "ai",
    label: "AI Block",
    color: "text-blue-400",
    borderColor: "border-blue-500/40",
    bgColor: "bg-blue-500/10",
    defaultConfig: {
      model: "gpt-4o-mini",
      systemPrompt: "You are a helpful assistant.",
      temperature: "0.7",
    },
  },
  action: {
    id: "action",
    label: "Action Block",
    color: "text-amber-400",
    borderColor: "border-amber-500/40",
    bgColor: "bg-amber-500/10",
    defaultConfig: { actionType: "transform", transformPrompt: "Summarize the following:" },
  },
  output: {
    id: "output",
    label: "Output Block",
    color: "text-violet-400",
    borderColor: "border-violet-500/40",
    bgColor: "bg-violet-500/10",
    defaultConfig: { format: "text", label: "Result" },
  },
  condition: {
    id: "condition",
    label: "Condition Block",
    color: "text-orange-400",
    borderColor: "border-orange-500/40",
    bgColor: "bg-orange-500/10",
    defaultConfig: { operator: "contains", conditionValue: "" },
  },
};

export function FlowProvider({ children, initialNodes, initialEdges, initialName }) {
  const [nodes, setNodes] = useState(initialNodes || []);
  const [edges, setEdges] = useState(initialEdges || []);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [flowName, setFlowName] = useState(initialName || "Untitled Flow");
  const [variables, setVariables] = useState([]); // [{ key, value }]
  // pendingConnection: { fromNodeId, fromPort } — set when user clicks an output port
  const [pendingConnection, setPendingConnection] = useState(null);

  const addNode = useCallback((blockType, position) => {
    const meta = BLOCK_TYPES[blockType];
    const newNode = {
      id: `node_${nodeIdCounter++}`,
      type: blockType,
      label: meta.label,
      position: position || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 100 },
      config: { ...meta.defaultConfig },
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    return newNode.id;
  }, []);

  const updateNodeConfig = useCallback((nodeId, configPatch) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, config: { ...n.config, ...configPatch } } : n))
    );
  }, []);

  const updateNodePosition = useCallback((nodeId, position) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, position } : n))
    );
  }, []);

  const removeNode = useCallback((nodeId) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
    setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
    setPendingConnection(null);
  }, []);

  const addEdge = useCallback((fromNodeId, toNodeId) => {
    // No self-loops, no duplicate edges
    if (fromNodeId === toNodeId) return;
    setEdges((prev) => {
      const exists = prev.some((e) => e.from === fromNodeId && e.to === toNodeId);
      if (exists) return prev;
      return [...prev, { id: `edge_${fromNodeId}_${toNodeId}`, from: fromNodeId, to: toNodeId }];
    });
  }, []);

  const removeEdge = useCallback((edgeId) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }, []);

  const addVariable = useCallback((key, value = "") => {
    setVariables((prev) => {
      if (prev.some((v) => v.key === key)) return prev;
      return [...prev, { key, value }];
    });
  }, []);

  const updateVariable = useCallback((key, value) => {
    setVariables((prev) => prev.map((v) => (v.key === key ? { ...v, value } : v)));
  }, []);

  const removeVariable = useCallback((key) => {
    setVariables((prev) => prev.filter((v) => v.key !== key));
  }, []);

  const loadFlow = useCallback(({ name, nodes: n, edges: e, variables: vars }) => {
    setFlowName(name || "Untitled Flow");
    setNodes(n || []);
    setEdges(e || []);
    setVariables(vars || []);
    setSelectedNodeId(null);
    setPendingConnection(null);
    // Ensure counter is beyond any loaded node ids
    const maxId = (n || []).reduce((acc, node) => {
      const num = parseInt(node.id?.replace("node_", "") || "0", 10);
      return Math.max(acc, num);
    }, 0);
    nodeIdCounter = maxId + 1;
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <FlowContext.Provider
      value={{
        nodes,
        edges,
        selectedNodeId,
        selectedNode,
        flowName,
        setFlowName,
        variables,
        addVariable,
        updateVariable,
        removeVariable,
        pendingConnection,
        setPendingConnection,
        addNode,
        updateNodeConfig,
        updateNodePosition,
        removeNode,
        addEdge,
        removeEdge,
        loadFlow,
        setSelectedNodeId,
      }}
    >
      {children}
    </FlowContext.Provider>
  );
}

export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used inside FlowProvider");
  return ctx;
}