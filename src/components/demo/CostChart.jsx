import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import costsData from '@/data/demo/costs.json';

const COLORS = ['hsl(217,91%,60%)', 'hsl(160,60%,45%)', 'hsl(30,80%,55%)', 'hsl(280,65%,60%)', 'hsl(340,75%,55%)'];

export default function CostChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 w-full max-w-lg mx-auto">
      <div>
        <p className="text-sm font-bold text-foreground">Cost Across Products (30 days)</p>
        <p className="text-[11px] text-muted-foreground">Total: <span className="font-bold text-foreground">${costsData.summary.total_30d.toFixed(2)}</span> · Avg per run: ${costsData.summary.avg_per_run.toFixed(2)}</p>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={costsData.by_product} margin={{ left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
            formatter={(v, n, p) => [`$${v.toFixed(2)} (${p.payload.runs} runs)`, 'Cost']}
          />
          <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
            {costsData.by_product.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-5 gap-1">
        {costsData.by_product.map((p, i) => (
          <div key={p.name} className="text-center">
            <div className="h-2 w-2 rounded-full mx-auto mb-1" style={{ background: COLORS[i % COLORS.length] }} />
            <p className="text-[9px] text-muted-foreground truncate">{p.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}