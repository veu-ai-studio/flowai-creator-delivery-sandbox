import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { BLOCK_TYPES } from "@/lib/flowStore";

export default function NodeResultsPanel({ nodeResults }) {
  const [expanded, setExpanded] = useState({});

  if (!nodeResults || nodeResults.length === 0) return null;

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <span>Node Results</span>
        <span className="text-xs text-muted-foreground font-normal">
          ({nodeResults.filter((r) => r.status === "done").length}/{nodeResults.length} completed)
        </span>
      </h3>
      {nodeResults.map((r) => {
        const meta = BLOCK_TYPES[r.type] || {};
        const isOpen = expanded[r.id];
        return (
          <div key={r.id} className={`rounded-lg border ${meta.borderColor || "border-border"} ${meta.bgColor || "bg-card"} overflow-hidden`}>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/20 transition-colors"
              onClick={() => toggle(r.id)}
            >
              {r.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
              {r.status === "error" && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
              {r.status === "running" && (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
              )}
              {r.status === "pending" && <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              <span className={`text-xs font-medium ${meta.color || "text-foreground"}`}>{r.label}</span>
              {r.duration != null && (
                <span className="text-xs text-muted-foreground ml-auto mr-1">{r.duration}ms</span>
              )}
              {isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            </button>
            {isOpen && r.output != null && (
              <div className="px-3 pb-3 border-t border-border/50">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto mt-2 font-mono leading-relaxed">
                  {String(r.output).slice(0, 2000)}{String(r.output).length > 2000 ? "\n…(truncated)" : ""}
                </pre>
              </div>
            )}
            {isOpen && r.status === "error" && r.error && (
              <div className="px-3 pb-3 border-t border-border/50">
                <p className="text-xs text-destructive mt-2">{r.error}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}