import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useFlow } from "@/lib/flowStore";
import { FlaskConical, Play, ChevronDown, ChevronUp, Loader2, Copy, Check, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NodeTester({ node }) {
  const { variables } = useFlow();
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null); // { output, error, duration }
  const [copied, setCopied] = useState(false);

  // Build a minimal variable map from current flow variables
  const varMap = variables.reduce((acc, v) => { acc[v.key] = v.value; return acc; }, {});

  const interpolate = (text) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, k) => varMap[k] ?? `{{${k}}}`);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    const start = Date.now();

    try {
      let output = "";

      if (node.type === "input") {
        output = input || "(empty input)";
      } else if (node.type === "ai") {
        const cfg = node.config || {};
        const prompt = interpolate(cfg.systemPrompt || "You are a helpful assistant.");
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `${prompt}\n\nUser: ${input || "(no input)"}`,
          response_json_schema: cfg.outputSchema || undefined,
        });
        output = typeof res === "object" ? JSON.stringify(res, null, 2) : res;
      } else if (node.type === "action") {
        const cfg = node.config || {};
        if (cfg.actionType === "uppercase") output = input.toUpperCase();
        else if (cfg.actionType === "lowercase") output = input.toLowerCase();
        else if (cfg.actionType === "trim") output = input.trim();
        else if (cfg.actionType === "ai_transform") {
          const res = await base44.integrations.Core.InvokeLLM({
            prompt: `${interpolate(cfg.prompt || "Transform this text:")}\n\n${input}`,
          });
          output = res;
        } else output = input;
      } else if (node.type === "output") {
        const cfg = node.config || {};
        if (cfg.format === "uppercase") output = input.toUpperCase();
        else if (cfg.format === "json") {
          try { output = JSON.stringify(JSON.parse(input), null, 2); }
          catch { output = input; }
        } else output = input;
      } else if (node.type === "condition") {
        const cfg = node.config || {};
        const val = input;
        let matched = false;
        if (cfg.operator === "contains") matched = val.includes(cfg.value || "");
        else if (cfg.operator === "equals") matched = val === cfg.value;
        else if (cfg.operator === "starts_with") matched = val.startsWith(cfg.value || "");
        else if (cfg.operator === "ends_with") matched = val.endsWith(cfg.value || "");
        else if (cfg.operator === "longer_than") matched = val.length > Number(cfg.value || 0);
        else if (cfg.operator === "shorter_than") matched = val.length < Number(cfg.value || 0);
        output = matched ? "→ TRUE branch" : "→ FALSE branch";
      }

      setResult({ output, duration: Date.now() - start });
    } catch (err) {
      setResult({ error: err.message, duration: Date.now() - start });
    }
    setRunning(false);
  };

  const handleCopy = () => {
    if (result?.output) {
      navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-secondary/20 transition-colors"
      >
        <FlaskConical className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left">
          Test This Node
        </span>
        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter test input…"
            rows={3}
            className="w-full text-xs bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
          <Button size="sm" className="w-full gap-2 h-7 text-xs" onClick={handleRun} disabled={running}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            {running ? "Running…" : "Run Node"}
          </Button>

          {result && (
            <div className={`rounded-lg border p-2.5 space-y-1 ${result.error ? "border-destructive/30 bg-destructive/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
              <div className="flex items-center gap-1.5 justify-between">
                <div className="flex items-center gap-1.5">
                  {result.error
                    ? <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                    : <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />}
                  <span className="text-[10px] text-muted-foreground">{result.duration}ms</span>
                </div>
                {result.output && (
                  <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                )}
              </div>
              <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-mono leading-relaxed">
                {result.error || result.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}