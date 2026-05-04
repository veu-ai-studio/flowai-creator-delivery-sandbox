import { TextCursorInput, Brain, Cog, ArrowRightFromLine, GitBranch } from "lucide-react";
import { useFlow, BLOCK_TYPES } from "@/lib/flowStore";

const BLOCK_ICONS = {
  input: TextCursorInput,
  ai: Brain,
  action: Cog,
  output: ArrowRightFromLine,
  condition: GitBranch,
};

export default function BlockLibrary({ embedded }) {
  const { addNode } = useFlow();

  const handleDragStart = (e, blockType) => {
    e.dataTransfer.setData("blockType", blockType);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className={embedded ? "flex flex-col flex-1 overflow-hidden" : "w-60 border-r border-border bg-card flex flex-col shrink-0"}>
      <div className="p-4 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Block Library
        </h2>
        <p className="text-xs text-muted-foreground/60 mt-1">Drag to canvas</p>
      </div>
      <div className="p-3 space-y-2 flex-1 overflow-y-auto">
        {Object.values(BLOCK_TYPES).map(({ id, label, color, borderColor, bgColor, defaultConfig }) => {
          const Icon = BLOCK_ICONS[id];
          return (
            <div
              key={id}
              draggable
              onDragStart={(e) => handleDragStart(e, id)}
              onClick={() => addNode(id)}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/40 hover:bg-accent cursor-grab active:cursor-grabbing transition-colors select-none"
              title="Drag to canvas or click to add"
            >
              <div className={`h-9 w-9 rounded-md ${bgColor} border ${borderColor} flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {id === "input" && "Accepts user input"}
                  {id === "ai" && "Calls AI model"}
                  {id === "action" && "Transforms data"}
                  {id === "output" && "Returns result"}
                  {id === "condition" && "Branches on condition"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}