import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Terminal, Circle, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_ICON = {
  success: <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />,
  error: <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />,
  partial: <Zap className="h-3 w-3 text-amber-400 shrink-0" />,
};

export default function RealtimeLogs() {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Seed with recent runs
    base44.entities.FlowRun.list("-created_date", 10)
      .then((runs) => setLogs(runs.reverse()))
      .catch(() => {});

    // Subscribe to live updates
    const unsub = base44.entities.FlowRun.subscribe((event) => {
      if (event.type === "create") {
        setLogs((prev) => [...prev.slice(-49), event.data]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
      }
    });

    setConnected(true);
    return () => { unsub(); setConnected(false); };
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Run Log</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className={`h-2 w-2 fill-current ${connected ? "text-emerald-400 animate-pulse" : "text-muted-foreground"}`} />
          <span className="text-[10px] text-muted-foreground">{connected ? "Live" : "Offline"}</span>
        </div>
      </div>

      <div className="h-52 overflow-y-auto p-3 font-mono text-xs space-y-1.5">
        {logs.length === 0 ? (
          <p className="text-muted-foreground/50 text-center py-8">No runs yet — run a flow to see live events</p>
        ) : (
          <AnimatePresence initial={false}>
            {logs.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                {STATUS_ICON[r.status] || STATUS_ICON.partial}
                <span className="text-foreground/80 truncate flex-1">{r.flow_name}</span>
                {r.duration_ms && (
                  <span className="text-muted-foreground/60 shrink-0">{(r.duration_ms / 1000).toFixed(1)}s</span>
                )}
                <span className="text-muted-foreground/40 shrink-0 text-[10px]">
                  {r.created_date ? formatDistanceToNow(new Date(r.created_date), { addSuffix: true }) : ""}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}