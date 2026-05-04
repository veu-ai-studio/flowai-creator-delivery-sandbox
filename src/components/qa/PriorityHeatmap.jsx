import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

const LAYERS = ['ui_ux', 'api', 'logic', 'business_value'];
const LAYER_LABELS = { ui_ux: 'UI/UX', api: 'API', logic: 'Logic', business_value: 'Business' };
const PRIORITIES = ['critical', 'high', 'medium', 'low'];

function heatColor(count, max) {
  if (count === 0) return 'bg-secondary/30 text-muted-foreground';
  const intensity = count / Math.max(max, 1);
  if (intensity > 0.75) return 'bg-red-500/80 text-white';
  if (intensity > 0.5) return 'bg-red-500/50 text-red-100';
  if (intensity > 0.25) return 'bg-amber-500/50 text-amber-100';
  return 'bg-amber-500/20 text-amber-300';
}

export default function PriorityHeatmap({ results }) {
  const matrix = useMemo(() => {
    if (!results?.recommendations) return null;
    const recs = results.recommendations;

    const data = {};
    LAYERS.forEach(l => {
      data[l] = {};
      PRIORITIES.forEach(p => { data[l][p] = 0; });
    });

    recs.forEach(rec => {
      const layer = rec.layer || 'ui_ux';
      const priority = rec.priority || 'medium';
      if (data[layer] && data[layer][priority] !== undefined) {
        data[layer][priority]++;
      }
    });

    return data;
  }, [results]);

  const maxCount = useMemo(() => {
    if (!matrix) return 1;
    return Math.max(1, ...LAYERS.flatMap(l => PRIORITIES.map(p => matrix[l][p])));
  }, [matrix]);

  // Score bar per layer
  const layerScoreColor = (s) => s >= 7 ? 'bg-emerald-400' : s >= 5 ? 'bg-amber-400' : 'bg-red-400';

  if (!results) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 space-y-5"
    >
      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
        <Flame className="h-4 w-4 text-primary" />
        Priority Heatmap
      </h2>

      <p className="text-xs text-muted-foreground">
        Issue density per layer × severity. Darker = more issues at that priority.
      </p>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 text-muted-foreground w-24">Layer</th>
              {PRIORITIES.map(p => (
                <th key={p} className="text-center py-2 px-2 text-muted-foreground capitalize">{p}</th>
              ))}
              <th className="text-left py-2 pl-4 text-muted-foreground">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {LAYERS.map((layer, li) => {
              const score = results.scores?.[layer] ?? 0;
              return (
                <motion.tr
                  key={layer}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: li * 0.07 }}
                >
                  <td className="py-2 pr-4 font-semibold text-foreground">{LAYER_LABELS[layer]}</td>
                  {matrix && PRIORITIES.map(p => {
                    const count = matrix[layer][p];
                    return (
                      <td key={p} className="py-2 px-2 text-center">
                        <div className={`rounded-md w-10 h-10 mx-auto flex items-center justify-center font-bold text-sm transition-all ${heatColor(count, maxCount)}`}>
                          {count || '—'}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden w-20">
                        <div
                          className={`h-full rounded-full ${layerScoreColor(score)}`}
                          style={{ width: `${(score / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-foreground font-semibold">{score}/10</span>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground">Intensity:</p>
        {[
          { label: 'None', cls: 'bg-secondary/30' },
          { label: 'Low', cls: 'bg-amber-500/20' },
          { label: 'Med', cls: 'bg-amber-500/50' },
          { label: 'High', cls: 'bg-red-500/50' },
          { label: 'Critical', cls: 'bg-red-500/80' },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`h-3 w-5 rounded ${cls}`} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Top hot spots */}
      {matrix && (() => {
        const hotspots = LAYERS.flatMap(l =>
          PRIORITIES.map(p => ({ layer: l, priority: p, count: matrix[l][p] }))
        ).filter(h => h.count > 0).sort((a, b) => {
          const pi = ['critical', 'high', 'medium', 'low'];
          return (pi.indexOf(a.priority) - pi.indexOf(b.priority)) || b.count - a.count;
        }).slice(0, 4);

        if (hotspots.length === 0) return null;
        return (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Top Hotspots</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {hotspots.map((h, i) => (
                <div key={i} className="p-2 rounded-lg border border-border/50 bg-secondary/30 text-center space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">{LAYER_LABELS[h.layer]}</p>
                  <p className="text-xs font-semibold text-foreground capitalize">{h.priority}</p>
                  <p className="text-lg font-bold text-primary">{h.count}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
}