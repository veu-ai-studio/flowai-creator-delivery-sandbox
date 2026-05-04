import { useState, useRef, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Play, Terminal, FileOutput, Loader2, RotateCcw, AlertTriangle, FlaskConical, Copy, Check, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { executeFlow } from "@/lib/flowExecutor";
import { simulateFlow } from "@/lib/flowSimulator";
import { BLOCK_TYPES } from "@/lib/flowStore";
import { validateFlow, getExecutionOrder } from "@/lib/flowValidator";
import TestVariablesPanel from "@/components/run/TestVariablesPanel";
import RealtimeDebugger from "@/components/run/RealtimeDebugger";

export default function RunFlow() {
  const location = useLocation();

  // Prefer router state (passed from Designer), then fall back to most recent saved flow
  const routeState = location.state || null;

  const [nodes, setNodes] = useState(routeState?.nodes || []);
  const [edges, setEdges] = useState(routeState?.edges || []);
  const [passedName, setPassedName] = useState(routeState?.flowName || "Untitled Flow");
  const [passedVariables, setPassedVariables] = useState(routeState?.variables || []);
  const [loadingFlow, setLoadingFlow] = useState(!routeState);

  // If no state was passed (e.g. navigated directly), load the most recent saved flow
  useEffect(() => {
    if (routeState) return;
    base44.entities.SavedFlow.list("-updated_date", 1).then((flows) => {
      if (flows.length > 0) {
        const f = flows[0];
        setNodes(f.nodes || []);
        setEdges(f.edges || []);
        setPassedName(f.name || "Untitled Flow");
        setPassedVariables(f.variables || []);
      }
      setLoadingFlow(false);
    }).catch(() => setLoadingFlow(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validation = useMemo(() => validateFlow(nodes, edges), [nodes, edges]);
  const orderedNodes = useMemo(() => getExecutionOrder(nodes, edges), [nodes, edges]);

  // Keep a ref so the auto-run effect always sees the latest orderedNodes
  const orderedNodesRef = useRef([]);
  orderedNodesRef.current = orderedNodes; // update synchronously on every render

  const [userInput, setUserInput] = useState("");
  const [varOverrides, setVarOverrides] = useState({});
  const [logs, setLogs] = useState([]);
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const [nodeResults, setNodeResults] = useState([]);
  const [copied, setCopied] = useState(false);
  const [simulateMode, setSimulateMode] = useState(false);
  const logsEndRef = useRef(null);

  const appendLog = (line) => {
    setLogs((prev) => [...prev, line]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const handleVarChange = (key, value) => {
    setVarOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const buildVarMap = () => {
    const map = {};
    passedVariables.forEach((v) => { map[v.key] = v.value; });
    Object.entries(varOverrides).forEach(([k, v]) => { map[k] = v; });
    return map;
  };

  // Store handleRun in a ref so setTimeout always calls the latest version
  const handleRunRef = useRef(null);
  const handleRun = async (overrideNodes) => {
    if (runningRef.current) return;
    runningRef.current = true;

    const nodesToRun = Array.isArray(overrideNodes) ? overrideNodes : orderedNodesRef.current;

    setLogs([]);
    setOutput(null);
    setRunning(true);

    const initialResults = nodesToRun.map((n) => ({
      id: n.id, type: n.type, label: n.label, status: "pending", output: null, error: null, duration: null,
    }));
    setNodeResults(initialResults);

    appendLog(`[${new Date().toLocaleTimeString()}] Starting flow: "${passedName}"`);
    appendLog(`[${new Date().toLocaleTimeString()}] ${nodesToRun.length} block(s) queued.`);

    const varMap = buildVarMap();
    if (Object.keys(varMap).length > 0) {
      appendLog(`[${new Date().toLocaleTimeString()}] Variables: ${JSON.stringify(varMap)}`);
    }

    const runner = simulateMode ? simulateFlow : executeFlow;
    await runner(
      nodesToRun,
      userInput,
      varMap,
      (line) => appendLog(line),
      (result) => setOutput(result),
      (nodeResult) => {
        setNodeResults((prev) => prev.map((r) => (r.id === nodeResult.id ? nodeResult : r)));
      },
      { edges, flowName: passedName, flowId: location.state?.flowId || null }
    );

    runningRef.current = false;
    setRunning(false);
  };
  handleRunRef.current = handleRun;

  const handleReset = () => {
    setLogs([]);
    setOutput(null);
    setUserInput("");
    setNodeResults([]);
    setVarOverrides({});
  };

  const handleCopyOutput = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasInputBlock = nodes.some((n) => n.type === "input");
  const hasFlow = nodes.length > 0;

  // Auto-execute once — triggers when nodes are ready (either from state or DB fallback)
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (loadingFlow || !hasFlow || autoRanRef.current) return;
    autoRanRef.current = true;
    setTimeout(() => handleRunRef.current(orderedNodesRef.current), 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingFlow, hasFlow]);

  if (loadingFlow) {
    return (
      <div className="p-8 lg:p-10 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading most recent flow…</span>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-10 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Test Environment</h1>
          </div>
          {/* Simulate toggle */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setSimulateMode((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                simulateMode
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                  : "bg-secondary/50 border-border text-muted-foreground hover:border-amber-500/30 hover:text-amber-400"
              }`}
            >
              <Zap className="h-3 w-3" />
              {simulateMode ? "Simulation Mode — no real API calls" : "Live Mode — real AI execution"}
            </button>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            {nodes.length > 0
              ? `"${passedName}" — ${nodes.length} block${nodes.length !== 1 ? "s" : ""}`
              : "No flow loaded — go to the Designer and click Run Flow"}
          </p>
        </div>
      </motion.div>

      {/* Validation errors */}
      {nodes.length > 0 && validation && !validation.valid && (
        <motion.div
          className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {validation.errors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {e}
            </div>
          ))}
        </motion.div>
      )}

      {/* Execution order preview */}
      {nodes.length > 0 && (
        <motion.div
          className="mt-5 flex flex-wrap gap-2 items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <span className="text-xs text-muted-foreground">Order:</span>
          {orderedNodes.map((node, i) => {
            const meta = BLOCK_TYPES[node.type];
            const result = nodeResults.find((r) => r.id === node.id);
            const statusRing = result?.status === "done" ? "ring-1 ring-emerald-500/40"
              : result?.status === "error" ? "ring-1 ring-destructive/50"
              : result?.status === "running" ? "ring-1 ring-primary animate-pulse"
              : "";
            return (
              <div key={node.id} className="flex items-center gap-1.5">
                <div className={`text-xs px-2.5 py-1 rounded-full border ${meta.bgColor} ${meta.borderColor} ${meta.color} font-medium ${statusRing} transition-all`}>
                  {meta.label}
                </div>
                {i < orderedNodes.length - 1 && (
                  <span className="text-muted-foreground text-xs">→</span>
                )}
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Two-column layout for input + variables */}
      {nodes.length > 0 && (
        <motion.div
          className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {/* User input */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              {hasInputBlock
                ? nodes.find((n) => n.type === "input")?.config?.label || "User Input"
                : "Seed Input (no Input Block detected)"}
            </Label>
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={
                nodes.find((n) => n.type === "input")?.config?.placeholder ||
                "Enter your input here..."
              }
              className="bg-card border-border resize-none h-32 text-sm"
              disabled={running}
            />
          </div>

          {/* Variables override */}
          {passedVariables.length > 0 && (
            <TestVariablesPanel
              variables={passedVariables}
              values={varOverrides}
              onChange={handleVarChange}
            />
          )}
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        className="mt-5 flex gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          size="lg"
          className="gap-2"
          onClick={handleRun}
          disabled={running || nodes.length === 0 || (validation && !validation.valid)}
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Running..." : "Run Flow"}
        </Button>
        {(logs.length > 0 || output) && !running && (
          <Button variant="ghost" size="lg" className="gap-2" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        )}
      </motion.div>

      {/* Results section — two column */}
      <motion.div
        className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        {/* Left column: Realtime debugger + logs */}
        <div className="space-y-6">
          {nodeResults.length > 0 && (
            <RealtimeDebugger nodeResults={nodeResults} running={running} />
          )}

          {/* Execution Logs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Execution Logs</h2>
              {running && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            </div>
            <div className="rounded-xl border border-border bg-card min-h-[140px] max-h-[260px] p-4 font-mono text-xs overflow-y-auto">
              {logs.length === 0 ? (
                <span className="text-muted-foreground/50">No logs yet — run a flow to see output here</span>
              ) : (
                <div className="space-y-1">
                  {logs.map((line, i) => {
                    const isError = line.includes("[ERROR]");
                    const isSuccess = line.includes("complete");
                    return (
                      <div key={i} className={isError ? "text-destructive" : isSuccess ? "text-emerald-400" : "text-muted-foreground"}>
                        {line}
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Final output */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileOutput className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Output</h2>
            {output && (
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={handleCopyOutput}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card min-h-[300px] p-4 text-sm">
            {output === null ? (
              <span className="text-muted-foreground/50">Output will appear here after execution</span>
            ) : (
              <pre className="whitespace-pre-wrap text-foreground font-mono text-xs leading-relaxed">
                {output}
              </pre>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}