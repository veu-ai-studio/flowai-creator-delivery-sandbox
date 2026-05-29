import { motion } from 'framer-motion';
import { Trophy, TrendingUp, DollarSign, Clock, Database } from 'lucide-react';

function ScoreBadge({ score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-mono font-bold text-xs ${color}`}>{pct}</span>;
}

export default function ToolRankingTable({ tools, capability, priority }) {
  if (!tools || tools.length === 0) return null;

  // Filter to selected capability, sort by score
  const filtered = tools
    .filter(t => t.capability === capability)
    .sort((a, b) => (b.stats?.score || 0) - (a.stats?.score || 0));

  if (filtered.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-400" />
        Tool Rankings — <span className="capitalize text-primary">{capability}</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-normal">optimized for <span className="capitalize">{priority}</span></span>
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left pb-2 font-medium">#</th>
              <th className="text-left pb-2 font-medium">Tool</th>
              <th className="text-right pb-2 font-medium"><TrendingUp className="inline h-3 w-3 mr-0.5" />Score</th>
              <th className="text-right pb-2 font-medium">Success%</th>
              <th className="text-right pb-2 font-medium"><Clock className="inline h-3 w-3 mr-0.5" />Latency</th>
              <th className="text-right pb-2 font-medium"><DollarSign className="inline h-3 w-3 mr-0.5" />Cost/op</th>
              <th className="text-right pb-2 font-medium"><Database className="inline h-3 w-3 mr-0.5" />Samples</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filtered.map((tool, i) => {
              const s = tool.stats || {};
              return (
                <motion.tr key={tool.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className={`hover:bg-secondary/20 transition-colors ${i === 0 ? 'bg-primary/5' : ''}`}>
                  <td className="py-2.5 pr-2">
                    {i === 0
                      ? <Trophy className="h-3.5 w-3.5 text-amber-400" />
                      : <span className="text-muted-foreground font-mono">{i + 1}</span>}
                  </td>
                  <td className="py-2.5 pr-4">
                    <div>
                      <p className="font-semibold text-foreground">{tool.tool_name || tool.name}</p>
                      <p className="text-[10px] text-muted-foreground">{tool.provider}</p>
                    </div>
                  </td>
                  <td className="py-2.5 text-right"><ScoreBadge score={s.score} /></td>
                  <td className="py-2.5 text-right text-muted-foreground">{s.successRate ?? 80}%</td>
                  <td className="py-2.5 text-right text-muted-foreground">{s.avgLatency ?? '—'}ms</td>
                  <td className="py-2.5 text-right text-muted-foreground">${s.avgCost ?? tool.base_cost_usd}</td>
                  <td className="py-2.5 text-right">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.sampleSize > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-secondary text-muted-foreground'}`}>
                      {s.sampleSize > 0 ? s.sampleSize : 'default'}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}