import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Zap, Play, ShieldCheck, DollarSign, BarChart3, Package,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Mail, ChevronDown, ChevronUp
} from 'lucide-react';
import SandboxBanner from '@/components/demo/SandboxBanner';
import DemoFooter from '@/components/demo/DemoFooter';
import ClearanceSimulator from '@/components/demo/ClearanceSimulator';
import CostChart from '@/components/demo/CostChart';
import products from '@/data/demo/products.json';
import runs from '@/data/demo/runs.json';

const VERDICT_CFG = {
  'CLEARED':     { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/30' },
  'CONDITIONAL': { color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-500/30' },
  'NOT CLEARED': { color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-500/30' },
};

const TABS = [
  { key: 'overview', label: 'Portfolio', icon: Package },
  { key: 'runs', label: 'Run History', icon: Play },
  { key: 'clearance', label: 'Clearance', icon: ShieldCheck },
  { key: 'cost', label: 'Cost Analysis', icon: DollarSign },
];

function ScoreBadge({ score }) {
  if (score == null) return <span className="text-muted-foreground text-xs">—</span>;
  const color = score >= 7 ? 'text-emerald-400' : score >= 5 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-bold text-sm ${color}`}>{score}/10</span>;
}

export default function DemoSandbox() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [email, setEmail] = useState('');
  const [savedSession, setSavedSession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedRun, setExpandedRun] = useState(null);

  const saveSession = async () => {
    if (!email.trim() || !email.includes('@')) return;
    setSaving(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'sandbox', tier: 2 }),
      });
    } catch {}
    setSaving(false);
    setSavedSession(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-inter">
      <SandboxBanner message="You're in the FlowAI Sandbox — all data is simulated. Nothing here is stored or processed." color="amber" />

      {/* Nav */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">FlowAI Demo Sandbox</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/veaas')} className="text-xs h-8">Back to Marketing</Button>
            <Button size="sm" onClick={() => navigate('/enterprise-demo')} className="text-xs h-8 gap-1.5">
              <ShieldCheck className="h-3 w-3" /> Book a Real Demo
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* Two-column header: Video + Save Session */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Video placeholder */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="aspect-video bg-secondary/30 flex flex-col items-center justify-center gap-3 relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Play className="h-8 w-8 text-primary ml-1" />
              </div>
              <p className="text-sm font-semibold text-foreground">Watch the 4-Minute Walkthrough</p>
              <p className="text-xs text-muted-foreground">Video recording in production — available soon</p>
              <div className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                4:12
              </div>
            </div>
          </div>

          {/* Save session */}
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Save your sandbox session</h3>
              <p className="text-sm text-muted-foreground mt-1">Enter your email and we'll send you a follow-up with the full demo recording and pricing details.</p>
            </div>
            {savedSession ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Session saved! Check your inbox.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
                    className="h-9 text-sm flex-1" type="email" />
                  <Button size="sm" onClick={saveSession} disabled={saving || !email.includes('@')} className="gap-1.5 shrink-0">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">No spam. Just the demo recording + follow-up. Unsubscribe anytime.</p>
              </div>
            )}
            <div className="border-t border-border pt-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/enterprise-demo')} className="w-full gap-1.5 text-xs">
                Skip straight to enterprise demo →
              </Button>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>

          {tab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => (
                <div key={p.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{p.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{p.live_url}</p>
                    </div>
                    <ScoreBadge score={p.last_score} />
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{p.description}</p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`font-semibold ${p.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>{p.status.toUpperCase()}</span>
                    <span className="text-muted-foreground">Clearance: {p.clearance_step}/6</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'runs' && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-2.5 border-b border-border bg-secondary/20 flex text-[10px] font-bold text-muted-foreground uppercase tracking-wide gap-3">
                <div className="flex-1">Product</div>
                <div className="w-16 text-center hidden sm:block">Type</div>
                <div className="w-16 text-center hidden sm:block">Steps</div>
                <div className="w-16 text-center hidden md:block">Score</div>
                <div className="w-24 text-right">Verdict</div>
              </div>
              {runs.map(r => {
                const vc = VERDICT_CFG[r.verdict] || VERDICT_CFG['CONDITIONAL'];
                return (
                  <div key={r.id} className="border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => setExpandedRun(expandedRun === r.id ? null : r.id)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{r.product}</p>
                        <p className="text-[10px] text-muted-foreground">{r.started_at.slice(0, 10)} · {r.duration_min}m</p>
                      </div>
                      <span className="hidden sm:block text-[10px] text-muted-foreground w-16 text-center capitalize">{r.type}</span>
                      <span className="hidden sm:block text-[10px] text-muted-foreground w-16 text-center">{r.steps}/8</span>
                      <span className={`hidden md:block font-bold text-xs w-16 text-center ${r.score >= 7 ? 'text-emerald-400' : r.score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>{r.score}/10</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold w-24 text-center ${vc.color} ${vc.bg} ${vc.border}`}>{r.verdict}</span>
                      {expandedRun === r.id ? <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </div>
                    <AnimatePresence>
                      {expandedRun === r.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-secondary/10 border-t border-border/30 px-5 py-3">
                          <p className="text-[10px] text-muted-foreground">This is simulated demo data. In production, each step shows full AI-generated findings with scores, issues, and recommendations.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'clearance' && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">Simulate the 6-step Product Clearance Protocol for any product in the portfolio.</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {products.slice(0, 2).map(p => <ClearanceSimulator key={p.id} productName={p.name} />)}
              </div>
            </div>
          )}

          {tab === 'cost' && <CostChart />}

        </motion.div>
      </div>

      <DemoFooter />
    </div>
  );
}