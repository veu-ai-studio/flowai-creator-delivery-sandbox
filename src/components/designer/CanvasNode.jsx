import { useRef, useState } from "react";
import { TextCursorInput, Brain, Cog, ArrowRightFromLine, X, AlertTriangle, XCircle } from "lucide-react";
import { useFlow, BLOCK_TYPES } from "@/lib/flowStore";

const BLOCK_ICONS = {
  input: TextCursorInput,
  ai: Brain,
  action: Cog,
  output: ArrowRightFromLine,
};

// Node width must match the w-48 = 192px class
export const NODE_WIDTH = 192;
export const NODE_HEADER_H = 36;
export const NODE_BODY_H = 36;
export const NODE_H = NODE_HEADER_H + NODE_BODY_H;

export default function CanvasNode({ node, nodeIssues }) {
  const { selectedNodeId, setSelectedNodeId, updateNodePosition, removeNode, pendingConnection, setPendingConnection, addEdge, updateNodeConfig } = useFlow();
  const [showIssues, setShowIssues] = useState(false);
  const isSelected = selectedNodeId === node.id;
  const meta = BLOCK_TYPES[node.type];
  const Icon = BLOCK_ICONS[node.type];
  const hasError = nodeIssues?.errors?.length > 0;
  const hasWarning = !hasError && nodeIssues?.warnings?.length > 0;

  const dragOffset = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const handleMouseDown = (e) => {
    if (e.target.closest("[data-port]") || e.target.closest("[data-delete]")) return;
    e.preventDefault();
    moved.current = false;
    setSelectedNodeId(node.id);

    dragOffset.current = {
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y,
    };

    const onMouseMove = (ev) => {
      moved.current = true;
      updateNodePosition(node.id, {
        x: ev.clientX - dragOffset.current.x,
        y: ev.clientY - dragOffset.current.y,
      });
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Output port (bottom center) — starts a connection
  const handleOutputPortClick = (e) => {
    e.stopPropagation();
    if (pendingConnection) {
      setPendingConnection(null);
      return;
    }
    setPendingConnection({ fromNodeId: node.id });
  };

  // Input port (top center) — completes a connection
  const handleInputPortClick = (e) => {
    e.stopPropagation();
    if (!pendingConnection || pendingConnection.fromNodeId === node.id) {
      setPendingConnection(null);
      return;
    }
    addEdge(pendingConnection.fromNodeId, node.id);
    setPendingConnection(null);
  };

  const isPendingSource = pendingConnection?.fromNodeId === node.id;

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute select-none rounded-xl border-2 w-48 shadow-lg transition-all ${
        isSelected
          ? `${meta.borderColor} shadow-primary/20 cursor-grabbing`
          : hasError
          ? "border-destructive/50 cursor-grab"
          : hasWarning
          ? "border-amber-500/40 cursor-grab"
          : "border-border hover:border-border/80 cursor-grab"
      } ${isPendingSource ? "ring-2 ring-primary/50" : ""} bg-card`}
      style={{ left: node.position.x, top: node.position.y, zIndex: isSelected ? 10 : 1 }}
    >
      {/* Input port (top) */}
      <div
        data-port="input"
        onClick={handleInputPortClick}
        className={`absolute -top-2.5 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 z-20 transition-all cursor-crosshair
          ${pendingConnection && pendingConnection.fromNodeId !== node.id
            ? "border-primary bg-primary/30 scale-125"
            : "border-border bg-card hover:border-primary hover:bg-primary/20"
          }`}
        title="Input port — click to connect"
      />

      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${meta.bgColor} border-b ${meta.borderColor}`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
          <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
        </div>
        <button
          data-delete="true"
          onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
          className="h-4 w-4 rounded flex items-center justify-center hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-1.5">
        {node.type === "input" ? (
          <input
            type="text"
            value={node.config?.value || ""}
            onChange={(e) => updateNodeConfig(node.id, { value: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder={node.config?.placeholder || "Enter input..."}
            className="w-full h-7 px-2 text-xs rounded bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <p className="text-xs text-muted-foreground truncate">
            {node.type === "ai" && `Model: ${node.config.model || "gpt-4o-mini"}`}
            {node.type === "action" && `Action: ${node.config.actionType || "transform"}`}
            {node.type === "output" && `Format: ${node.config.format || "text"}`}
          </p>
        )}
      </div>

      {/* Output port (bottom) */}
      <div
        data-port="output"
        onClick={handleOutputPortClick}
        className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 z-20 transition-all cursor-crosshair
          ${isPendingSource
            ? "border-primary bg-primary scale-125"
            : "border-border bg-card hover:border-primary hover:bg-primary/20"
          }`}
        title="Output port — click to start connection"
      />

      {/* Validation badge */}
      {(hasError || hasWarning) && (
        <div className="absolute -top-2 -right-2 z-30">
          <button
            data-delete="ignore"
            onClick={(e) => { e.stopPropagation(); setShowIssues((v) => !v); }}
            className={`h-5 w-5 rounded-full flex items-center justify-center shadow-md border transition-all ${
              hasError
                ? "bg-destructive border-destructive/50 hover:bg-destructive/80"
                : "bg-amber-500 border-amber-500/50 hover:bg-amber-400"
            }`}
            title={hasError ? "Validation errors" : "Validation warnings"}
          >
            {hasError
              ? <XCircle className="h-3 w-3 text-white" />
              : <AlertTriangle className="h-3 w-3 text-white" />}
          </button>

          {/* Issues tooltip */}
          {showIssues && (
            <div
              className="absolute top-6 right-0 w-52 bg-popover border border-border rounded-lg shadow-xl p-2.5 space-y-1 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              {nodeIssues.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                  <XCircle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{e}</span>
                </div>
              ))}
              {nodeIssues.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-amber-400">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}