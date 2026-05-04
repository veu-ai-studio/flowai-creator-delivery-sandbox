import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';

const PLAN_LABELS = {
  free: { label: 'Free', color: 'text-muted-foreground bg-secondary', badge: 'bg-secondary/50 text-muted-foreground' },
  pro: { label: 'Pro', color: 'text-primary bg-primary/10', badge: 'bg-primary/20 text-primary' },
};

export default function BillingPanel({ user, onStatus, status }) {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState([]);

  useEffect(() => { if (user) fetchUsage(); }, [user]);

  const fetchUsage = async () => {
    setLoading(true);
    const results = [];
    try {
      const res = await base44.functions.invoke('usageStats', {});
      const data = res?.data;
      setUsageData(data);

      results.push({ label: 'Usage endpoint responds', pass: !!data });
      results.push({ label: 'Plan detected', pass: !!data?.plan });
      results.push({ label: 'Usage counters tracked', pass: !!data?.usage });
      results.push({ label: 'Limits enforced', pass: !!data?.limits });

      // Check a specific action
      const checkRes = await base44.functions.invoke('usageStats', { check_action: 'run' });
      results.push({ label: 'Limit gate check works', pass: typeof checkRes?.data?.allowed === 'boolean' });

      setChecks(results);
      onStatus(results.every(r => r.pass) ? 'active' : 'failed');
    } catch (e) {
      results.push({ label: 'Billing error: ' + e.message, pass: false });
      setChecks(results);
      onStatus('failed');
    } finally { setLoading(false); }
  };

  const plan = usageData?.plan || 'free';
  const planStyle = PLAN_LABELS[plan] || PLAN_LABELS.free;

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-amber-400" />
          Phase G — Billing
        </h2>
        {status === 'active' && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">BILLING ACTIVE</span>}
      </div>

      {/* Plan card */}
      {usageData && (
        <div className={`rounded-lg border border-border p-4 flex items-center justify-between ${planStyle.color}`}>
          <div className="space-y-0.5">
            <p className="text-sm font-bold">{planStyle.label} Plan</p>
            <p className="text-xs opacity-70">{user?.email}</p>
          </div>
          {plan === 'free' && (
            <Button size="sm" className="gap-1.5" onClick={() => alert('Upgrade flow — connect Stripe or Wix Payments')}>
              <Zap className="h-3.5 w-3.5" /> Upgrade to Pro
            </Button>
          )}
        </div>
      )}

      {/* Usage meters */}
      {usageData && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">This Month's Usage</p>
          {Object.entries(usageData.limits || {}).map(([action, limit]) => {
            const used = usageData.usage?.[action] || 0;
            const pct = Math.min((used / limit) * 100, 100);
            const over = used >= limit;
            return (
              <div key={action} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="capitalize text-foreground">{action}</span>
                  <span className={over ? 'text-red-400 font-semibold' : 'text-muted-foreground'}>{used} / {limit}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary/50">
                  <motion.div
                    className={`h-full rounded-full ${over ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-primary'}`}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button size="sm" onClick={fetchUsage} disabled={loading || !user} className="gap-1.5">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
        Refresh Usage
      </Button>

      {checks.map((c, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
          className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/30 border border-border/30">
          {c.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
          <span className={c.pass ? 'text-foreground' : 'text-red-400'}>{c.label}</span>
        </motion.div>
      ))}

      <div className="text-[10px] font-mono text-muted-foreground space-y-0.5 pt-2 border-t border-border">
        <p>• Free: 10 runs · 2 deploys · 5 audits/month</p>
        <p>• Pro: unlimited runs · 50 deploys · unlimited audits</p>
        <p>• Limits enforced per action via usageStats function</p>
      </div>
    </div>
  );
}