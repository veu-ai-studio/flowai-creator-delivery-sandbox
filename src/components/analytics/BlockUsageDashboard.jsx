import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BLOCK_TYPES } from "@/lib/flowStore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Layers, Loader2, Brain, TextCursorInput, Cog, ArrowRightFromLine, GitBranch } from "lucide-react";

const BLOCK_ICONS = {
  input: TextCursorInput,
  ai: Brain,
  action: Cog,
  output: ArrowRightFromLine,
  condition: GitBranch,
};

const TOOLTIP_STYLE = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 };

export default function BlockUsageDashboard() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.SavedFlow.list("-updated_date", 200)
      .then((data) => { setFlows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const { blockCounts, totalBlocks, modelUsage, avgBlocksPerFlow, mostUsedBlock } = useMemo(() => {
    const counts = {};
    const models = {};
    let totalBlocks = 0;

    flows.forEach((flow) => {
      (flow.nodes || []).forEach((node) => {
        counts[node.type] = (counts[node.type] || 0) + 1;
        totalBlocks++;
        if (node.type === "ai" && node.config?.model) {
          models[node.config.model] = (models[node.config.model] || 0) + 1;
        }
      });
    });

    const blockCounts = Object.entries(counts)
      .map(([type, count]) => ({ type, count, meta: BLOCK_TYPES[type] }))
      .sort((a, b) => b.count - a.count);

    const avgBlocksPerFlow = flows.length > 0 ? (totalBlocks / flows.length).toFixed(1) : 0;
    const mostUsedBlock = blockCounts[0] || null;

    const modelUsage = Object.entries(models)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);

    return { blockCounts, totalBlocks, modelUsage, avgBlocksPerFlow, mostUsedBlock };
  }, [flows]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const chartData = blockCounts.map((b) => ({
    name: b.meta?.label?.replace(" Block", "") || b.type,
    count: b.count,
    fill: b.type === "input" ? "#34d399"
        : b.type === "ai" ? "#60a5fa"
        : b.type === "action" ? "#a78bfa"
        : b.type === "output" ? "#f59e0b"
        : "#f87171",
  }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Blocks", value: totalBlocks, color: "text-primary" },
          { label: "Across Flows", value: flows.length, color: "text-blue-400" },
          { label: "Avg per Flow", value: avgBlocksPerFlow, color: "text-violet-400" },
          { label: "Top Block", value: mostUsedBlock?.meta?.label?.replace(" Block", "") || "—", color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Block usage bar chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Block Type Usage</h3>
          </div>
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No blocks found.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={72} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Count">
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Block breakdown list */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Detailed Breakdown</h3>
          </div>
          <div className="space-y-3">
            {blockCounts.map(({ type, count, meta }) => {
              const Icon = BLOCK_ICONS[type] || Layers;
              const pct = totalBlocks > 0 ? Math.round((count / totalBlocks) * 100) : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`h-6 w-6 rounded-md ${meta?.bgColor} border ${meta?.borderColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-3 w-3 ${meta?.color}`} />
                    </div>
                    <span className="text-foreground font-medium flex-1">{meta?.label || type}</span>
                    <span className="text-muted-foreground">{count} block{count !== 1 ? "s" : ""}</span>
                    <span className="text-muted-foreground/50 w-8 text-right">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden ml-8">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: meta?.color?.includes("blue") ? "#60a5fa" : meta?.color?.includes("emerald") ? "#34d399" : meta?.color?.includes("violet") ? "#a78bfa" : meta?.color?.includes("amber") ? "#f59e0b" : "#f87171" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI model usage */}
          {modelUsage.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Model Usage</p>
              {modelUsage.map(({ model, count }) => (
                <div key={model} className="flex items-center gap-2 text-xs">
                  <Brain className="h-3 w-3 text-blue-400 shrink-0" />
                  <span className="text-foreground font-mono flex-1">{model}</span>
                  <span className="text-muted-foreground">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}