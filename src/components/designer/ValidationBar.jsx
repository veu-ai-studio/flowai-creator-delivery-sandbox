import { AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export default function ValidationBar({ result }) {
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  const total = result.errors.length + result.warnings.length;

  // Show green "all good" state
  if (total === 0) {
    return (
      <div className="border-b border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 flex items-center gap-2 text-xs text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">Flow is valid — ready to run</span>
      </div>
    );
  }

  const hasErrors = result.errors.length > 0;

  return (
    <div className={`border-b text-xs ${hasErrors ? "bg-destructive/10 border-destructive/30" : "bg-amber-500/10 border-amber-500/30"}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 text-left"
      >
        {hasErrors
          ? <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
          : <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        }
        <span className={hasErrors ? "text-destructive font-medium" : "text-amber-400 font-medium"}>
          {hasErrors
            ? `${result.errors.length} error${result.errors.length !== 1 ? "s" : ""}`
            : `${result.warnings.length} warning${result.warnings.length !== 1 ? "s" : ""}`}
          {result.warnings.length > 0 && hasErrors && `, ${result.warnings.length} warning${result.warnings.length !== 1 ? "s" : ""}`}
        </span>
        <span className="text-muted-foreground ml-auto">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1">
          {result.errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-destructive">
              <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{e}</span>
            </div>
          ))}
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-amber-400">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}