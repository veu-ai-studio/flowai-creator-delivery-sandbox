import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CreditCard, Zap, CheckCircle2, Loader2, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';

const PLANS = {
  free: {
    name: 'Free',
    price: '$0',
    period: '/mo',
    color: 'border-border',
    badge: 'bg-secondary/50 text-muted-foreground',
    features: ['10 pipeline runs/mo', '2 deployments/mo', '5 QA audits/mo', '5 research runs/mo', '3 builds/mo'],
  },
  pro: {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    color: 'border-primary/50',
    badge: 'bg-primary/20 text-primary',
    features: ['Unlimited pipeline runs', '50 deployments/mo', 'Unlimited QA audits', 'Unlimited research', 'Unlimited builds', 'Priority support', 'Slack notifications'],
    highlight: true,
  },
};

const ACTION_LABELS = {
  run: 'Pipeline Runs',
  deploy: 'Deployments',
  audit: 'QA Audits',
  research: 'Research',
  build: 'Builds',
};

function UsageMeter({ action, used, limit, plan }) {
  const pct = Math.min((used / limit) * 100, 100);
  const over = used >= limit;
  const nearLimit = pct >= 75 && !over;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-foreground">{ACTION_LABELS[action] || action}</span>
        <span className={over ? 'text-red-400 font-bold' : nearLimit ? 'text-amber-400 font-semibold' : 'text-muted-foreground'}>
          {used} / {limit === 999 ? '∞' : limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${over ? 'bg-red-500' : nearLimit ? 'bg-amber-500' : 'bg-primary'}`}
          initial={{ width: 0 }}
          animate={{ width: `${limit === 999 ? 0 : pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export default function Billing() {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [me, stats, records] = await Promise.all([
        base44.auth.me(),
        base44.functions.invoke('usageStats', {}),
        base44.entities.UsageRecord.list('-created_date', 30),
      ]);
      setUser(me);
      setUsageData(stats?.data);
      setHistory(records);
    } catch {} finally { setLoading(false); }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    // Simulate upgrade flow — in production wire to Stripe/Wix Payments
    await new Promise(r => setTimeout(r, 1500));
    alert('To enable Pro billing, connect Stripe or Wix Payments in your Base44 dashboard settings.');
    setUpgrading(false);
  };

  const plan = usageData?.plan || 'free';
  const currentPlan = PLANS[plan] || PLANS.free;

  // Group recent usage by action for the timeline
  const recentByAction = history.reduce((acc, r) => {
    if (!acc[r.action]) acc[r.action] = 0;
    acc[r.action]++;
    return acc;
  }, {});

  return (
    <div className="p-8 lg:p-10 max-w-4xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-primary" />
            Billing & Usage
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your plan and monitor resource usage</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchData} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </motion.div>

      {/* Current Plan Banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className={`rounded-xl border-2 p-5 flex items-center justify-between ${currentPlan.color} bg-card`}>
        <div className="flex items-center gap-4">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${plan === 'pro' ? 'bg-primary/10' : 'bg-secondary/50'}`}>
            {plan === 'pro' ? <Zap className="h-5 w-5 text-primary" /> : <CreditCard className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-foreground">{currentPlan.name} Plan</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentPlan.badge}`}>{plan.toUpperCase()}</span>
            </div>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{currentPlan.price}<span className="text-sm font-normal text-muted-foreground">{currentPlan.period}</span></p>
          {plan === 'free' && (
            <Button size="sm" onClick={handleUpgrade} disabled={upgrading} className="mt-2 gap-1.5">
              {upgrading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Upgrade to Pro
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Meters */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-lg border border-border bg-card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> This Month's Usage
          </h2>
          {loading && !usageData ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : usageData ? (
            <div className="space-y-4">
              {Object.entries(usageData.limits || {}).map(([action, limit]) => (
                <UsageMeter key={action} action={action} used={usageData.usage?.[action] || 0} limit={limit} plan={plan} />
              ))}
            </div>
          ) : null}

          {/* Limit warnings */}
          {usageData && Object.entries(usageData.usage || {}).some(([a, v]) => v >= (usageData.limits?.[a] || 0)) && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>Some limits reached. <button onClick={handleUpgrade} className="underline font-semibold">Upgrade to Pro</button> for unlimited usage.</p>
            </div>
          )}
        </motion.div>

        {/* Plan Comparison */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="space-y-3">
          {Object.entries(PLANS).map(([key, p]) => (
            <div key={key} className={`rounded-xl border-2 p-4 space-y-3 ${key === plan ? p.color : 'border-border opacity-70'} bg-card`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{p.name}</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{p.price}<span className="text-xs font-normal text-muted-foreground">{p.period}</span></p>
                </div>
                {key === plan && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">CURRENT</span>}
              </div>
              <ul className="space-y-1.5">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {key !== plan && key === 'pro' && (
                <Button size="sm" className="w-full gap-1.5" onClick={handleUpgrade} disabled={upgrading}>
                  {upgrading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Upgrade to Pro
                </Button>
              )}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Recent Usage History */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Recent Usage Events</h2>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No usage recorded yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.slice(0, 20).map((r, i) => (
              <motion.div key={r.id || i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className="flex items-center justify-between text-xs p-2 rounded-lg border border-border/50 bg-secondary/20">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-foreground capitalize font-medium">{ACTION_LABELS[r.action] || r.action}</span>
                  <span className="text-muted-foreground">by {r.user_email}</span>
                </div>
                <span className="text-muted-foreground font-mono">{new Date(r.created_date).toLocaleDateString()}</span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}