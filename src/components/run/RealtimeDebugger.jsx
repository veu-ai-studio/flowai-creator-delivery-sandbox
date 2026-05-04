import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BLOCK_TYPES } from "@/lib/flowStore";
import {
  CheckCircle2, AlertCircle, Loader2, Clock, ChevronDown, ChevronUp,
  Copy, Check, Zap, XCircle
} from "lucide-react";

const STATUS_CONFIG = {
  pending:  { icon: Clock,        color: "text-muted-foreground",  ring: "border-border",           pulse: false, bg: "" },
  running:  { icon: Loader2,      color: "text-primary",           ring: "border-primary",          pulse: true,  bg: "bg-primary/5" },
  done:     { icon: CheckCircle2, color: "text-emerald-400",       ring: "border-emerald-500/40",   pulse: false, bg: "bg-emerald-500/3" },
  error:    { icon: AlertCircle,  color: "text-destructive",       ring: "border-destructive/40",   pulse: false, bg: "bg-destructive/5" },
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="p-0.5 rounded hover:bg-secondary transition-colors" title="Copy output">
      {copied ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5 text-muted-foreground" />}
    </button>
  );
}

function NodeDebugCard({ result, isActive, stepNumber }) {
  const [expanded, setExpanded] = useState(false);
  const meta = BLOCK_TYPES[result.type] || {};
  const s = STATUS_CONFIG[result.status] || STATUS_CONFIG.pending;
  const Icon = s.icon;
  const hasOutput = result.status === "done" && result.output;
  const hasError = result.status === "error" && result.error;
  const canExpand = hasOutput || hasError;

  // Auto-expand running node
  useEffect(() => {
    if (result.status === "running") setExpanded(true);
    if (result.status === "pending") setExpanded(false);
  }, [result.status]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg border transition-all overflow-hidden ${isActive ? `${s.ring} ${s.bg}` : "border-border bg-secondary/20"}`}
    >
      {/* Header row */}
      <div
        className={`flex items-center gap-2 p-2.5 ${canExpand ? "cursor-pointer select-none" : ""}`}
        onClick={() => canExpand && setExpanded((v) => !v)}
      >
        {/* Step number */}
        <span className="text-[10px] text-muted-foreground/50 font-mono w-4 text-center shrink-0">{stepNumber}</span>

        {/* Block icon */}
        <div className={`h-6 w-6 rounded-md ${meta.bgColor || "bg-secondary"} border ${meta.borderColor || "border-border"} flex items-center justify-center shrink-0`}>
          <Icon className={`h-3 w-3 ${s.color} ${s.pulse ? "animate-spin" : ""}`} />
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{result.label}</p>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] capitalize font-medium ${s.color}`}>{result.status}</span>
            {result.duration != null && (
              <span className="text-[10px] text-muted-foreground">{result.duration}ms</span>
            )}
          </div>
        </div>

        {/* Copy + expand */}
        <div className="flex items-center gap-1 shrink-0">
          {hasOutput && <CopyButton text={String(result.output)} />}
          {canExpand && (
            <span className="text-muted-foreground/50">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </span>
          )}
        </div>
      </div>

      {/* Expandable output / error */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {hasOutput && (
              <div className="mx-2.5 mb-2.5 text-[10px] text-muted-foreground bg-background/60 rounded px-2 py-2 font-mono max-h-28 overflow-y-auto leading-relaxed border border-border/50 whitespace-pre-wrap">
                {typeof result.output === "string"
                  ? result.output.slice(0, 400) + (result.output.length > 400 ? "\n…(truncated)" : "")
                  : JSON.stringify(result.output, null, 2).slice(0, 400)}
              </div>
            )}
            {hasError && (
              <div className="mx-2.5 mb-2.5 text-[10px] text-destructive bg-destructive/10 rounded px-2 py-2 font-mono border border-destructive/20 whitespace-pre-wrap">
                <div className="flex items-center gap-1 mb-1 font-semibold">
                  <XCircle className="h-3 w-3" /> Error
                </div>
                {result.error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function RealtimeDebugger({ nodeResults, running }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    const runningIdx = nodeResults.findIndex((r) => r.status === "running");
    if (runningIdx !== -1) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [nodeResults]);

  if (nodeResults.length === 0) return null;

  const doneCount = nodeResults.filter((r) => r.status === "done").length;
  const errorCount = nodeResults.filter((r) => r.status === "error").length;
  const runningNode = nodeResults.find((r) => r.status === "running");
  const totalDuration = nodeResults.reduce((s, r) => s + (r.duration || 0), 0);
  const progressPct = Math.round((doneCount / nodeResults.length) * 100);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-2 w-2 rounded-full shrink-0 ${running ? "bg-primary animate-pulse" : errorCount > 0 ? "bg-destructive" : "bg-emerald-400"}`} />
          <span className="text-xs font-semibold text-foreground flex-1 truncate">
            {running ? `Executing — ${runningNode?.label || "…"}` : errorCount > 0 ? `Finished with ${errorCount} error${errorCount > 1 ? "s" : ""}` : "Execution Complete"}
          </span>
          <div className="flex items-center gap-2 shrink-0 text-[10px] text-muted-foreground">
            {!running && totalDuration > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="h-2.5 w-2.5" />
                {totalDuration}ms total
              </span>
            )}
            <span>{doneCount}/{nodeResults.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-border overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${errorCount > 0 ? "bg-destructive" : "bg-primary"}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Node trace */}
      <div className="p-3 space-y-1.5 max-h-80 overflow-y-auto">
        {nodeResults.map((result, i) => (
          <div key={result.id} className="flex flex-col gap-1">
            <NodeDebugCard result={result} isActive={result.status === "running"} stepNumber={i + 1} />
            {i < nodeResults.length - 1 && (
              <div className="flex justify-center py-0.5">
                <div className="w-px h-3 bg-border" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}