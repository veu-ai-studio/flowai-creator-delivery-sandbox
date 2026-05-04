import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

function ScoreBadge({ value }) {
  const color = value >= 80 ? 'text-emerald-400' : value >= 60 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-bold font-mono ${color}`}>{value}%</span>;
}

export default function ToolStatsTable({ tools }) {
  if (!tools || tools.length === 0) return null;

  const sorted = [...tools].sort((a, b) => b.total - a.total);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        Tool Performance Breakdown
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide pr-4">Tool</th>
              <th className="pb-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide pr-4">Capability</th>
              <th className="pb-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide pr-4">Success</th>
              <th className="pb-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide pr-4">Avg Latency</th>
              <th className="pb-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide pr-4">Avg Cost</th>
              <th className="pb-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Runs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {sorted.map((tool, i) => (
              <motion.tr key={tool.tool_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="hover:bg-secondary/20">
                <td className="py-2.5 pr-4 font-medium text-foreground">{tool.tool_name}</td>
                <td className="py-2.5 pr-4 text-muted-foreground capitalize">{tool.capability}</td>
                <td className="py-2.5 pr-4"><ScoreBadge value={tool.success_rate} /></td>
                <td className="py-2.5 pr-4 font-mono text-muted-foreground">{(tool.avg_latency_ms / 1000).toFixed(1)}s</td>
                <td className="py-2.5 pr-4 font-mono text-muted-foreground">${tool.avg_cost_usd}</td>
                <td className="py-2.5 text-muted-foreground">{tool.total}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}