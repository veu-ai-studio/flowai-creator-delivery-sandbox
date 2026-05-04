// Summary stats dashboard for the Clearance page
import { ShieldCheck, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ClearanceStatusDashboard({ records, allProducts }) {
  const totals = allProducts.length;
  const cleared = allProducts.filter(p => records[p.product_name]?.overall_status === 'cleared').length;
  const inProgress = allProducts.filter(p => records[p.product_name]?.overall_status === 'in_progress').length;
  const blocked = allProducts.filter(p => records[p.product_name]?.overall_status === 'blocked').length;
  const notStarted = totals - cleared - inProgress - blocked;

  const stats = [
    { label: 'Total Products',  value: totals,     icon: ShieldCheck, color: 'text-foreground',    bg: 'bg-secondary/30',      border: 'border-border' },
    { label: 'Cleared',         value: cleared,    icon: CheckCircle2, color: 'text-emerald-400',  bg: 'bg-emerald-500/5',     border: 'border-emerald-500/20' },
    { label: 'In Progress',     value: inProgress, icon: Clock,        color: 'text-blue-400',     bg: 'bg-blue-500/5',        border: 'border-blue-500/20' },
    { label: 'Blocked',         value: blocked,    icon: AlertCircle,  color: 'text-red-400',      bg: 'bg-red-500/5',         border: 'border-red-500/20' },
    { label: 'Not Started',     value: notStarted, icon: Clock,        color: 'text-muted-foreground', bg: 'bg-secondary/20', border: 'border-border' },
  ];

  // Step completion breakdown
  const stepCounts = [1,2,3,4,5,6].map(n => {
    const passed = allProducts.filter(p => records[p.product_name]?.[`step${n}_status`] === 'passed').length;
    return { step: n, passed };
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Portfolio Status Dashboard</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-lg border ${s.border} ${s.bg} p-3 space-y-1`}>
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground">Step-by-step completion ({allProducts.length} products)</p>
        <div className="flex gap-2 flex-wrap">
          {stepCounts.map(({ step, passed }) => (
            <div key={step} className="flex items-center gap-1.5">
              <div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: allProducts.length > 0 ? `${(passed / allProducts.length) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">Step {step}: {passed}/{allProducts.length}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}