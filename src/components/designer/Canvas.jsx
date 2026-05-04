import { useRef } from "react";
import { useFlow } from "@/lib/flowStore";
import CanvasNode from "./CanvasNode";
import EdgeLayer from "./EdgeLayer";
import { MousePointer2, TextCursorInput, Brain, ArrowRightFromLine } from "lucide-react";

export default function Canvas({ validationResult }) {
  const { nodes, addNode, setSelectedNodeId, setPendingConnection } = useFlow();
  const canvasRef = useRef(null);

  // Per-node errors from validation
  const nodeErrorMap = {};
  if (validationResult?.errors) {
    // We can map error messages to nodes if needed (future enhancement)
  }

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData("blockType");
    if (!blockType) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left - 96,
      y: e.clientY - rect.top - 30,
    };
    addNode(blockType, position);
  };

  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget || e.target === canvasRef.current) {
      setSelectedNodeId(null);
      setPendingConnection(null);
    }
  };

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* SVG edge layer */}
      <EdgeLayer canvasRef={canvasRef} />

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-sm">
            <div className="h-14 w-14 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mx-auto mb-4">
              <MousePointer2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">
              Build your first flow
            </p>
            <p className="text-xs text-muted-foreground/60 mb-5">
              Click any block in the left panel, or drag it here
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/50">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <TextCursorInput className="h-3 w-3" /> Input
              </div>
              <span>→</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Brain className="h-3 w-3" /> AI
              </div>
              <span>→</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <ArrowRightFromLine className="h-3 w-3" /> Output
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/40 mt-3">
              Connect blocks by clicking the ● port on one and the ● port on another
            </p>
          </div>
        </div>
      )}

      {/* Nodes */}
      {nodes.map((node) => (
        <CanvasNode
          key={node.id}
          node={node}
          nodeIssues={validationResult?.nodeIssues?.get(node.id) || null}
        />
      ))}
    </div>
  );
}