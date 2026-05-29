import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Shield, ShieldCheck, ShieldAlert, Loader2,
  Lock, Eye, EyeOff, AlertTriangle, CheckCircle2, Bot,
  Fingerprint, Zap, Globe
} from 'lucide-react';
import AntiScrapingAlerts from '@/components/protection/AntiScrapingAlerts';
import StatusAlertSystem from '@/components/shared/StatusAlertSystem';

const PROTECTION_LAYERS = [
  { key: 'anti_crawl',    label: 'Anti-Crawl Defense',      icon: Bot,         color: 'text-blue-400',   desc: 'Rate limiting, robots.txt, honeypot traps' },
  { key: 'auth_hardening',label: 'Auth Hardening',           icon: Lock,        color: 'text-emerald-400',desc: 'RBAC enforcement, session security, token rotation' },
  { key: 'obfuscation',   label: 'Code Obfuscation',         icon: EyeOff,      color: 'text-purple-400', desc: 'JS minification, API endpoint masking' },
  { key: 'watermarking',  label: 'AI Content Watermarking',  icon: Fingerprint, color: 'text-amber-400',  desc: 'Embed ownership signals in AI-generated outputs' },
  { key: 'waf',           label: 'WAF Rules',                icon: Shield,      color: 'text-red-400',    desc: 'Block malicious requests, SQL injection, XSS' },
  { key: 'monitoring',    label: 'Threat Monitoring',        icon: Eye,         color: 'text-sky-400',    desc: 'Real-time anomaly detection and alerting' },
];

const SEV_STYLE = {
  critical: 'border-red-500/40 bg-red-500/5 text-red-400',
  high:     'border-orange-500/40 bg-orange-500/5 text-orange-400',
  medium:   'border-amber-500/40 bg-amber-500/5 text-amber-400',
  low:      'border-border bg-secondary/20 text-muted-foreground',
};

export default function SelfProtection() {
  const [url, setUrl] = useState('');
  const [selectedLayers, setSelectedLayers] = useState(PROTECTION_LAYERS.map(l => l.key));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('scan');

  const toggleLayer = key => setSelectedLayers(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );

  const handleScan = async () => {
    if (!url.trim()) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await base44.functions.invoke('selfProtection', { url, layers: selectedLayers, mode: 'scan' });
      setResult(res?.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const handleApply = async () => {
    if (!url.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('selfProtection', { url, layers: selectedLayers, mode: 'apply' });
      setResult(res?.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const overallScore = result?.protection_score ?? null;
  const scoreColor = overallScore >= 80 ? 'text-emerald-400' : overallScore >= 60 ? 'text-amber-400' : 'text-red-400';
  const scoreRing  = overallScore >= 80 ? 'stroke-emerald-400' : overallScore >= 60 ? 'stroke-amber-400' : 'stroke-red-400';

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          Self-Protection Shield
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prevent third-party crawling, reverse engineering, and data theft across all FlowAI-processed platforms.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/30 border border-border w-fit">
        {[{ key: 'scan', label: 'Scan & Audit' }, { key: 'apply', label: 'Apply Protection' }, { key: 'monitor', label: 'Live Threats' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Protection Layer Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PROTECTION_LAYERS.map(({ key, label, icon: Icon, color, desc }) => (
          <button key={key} onClick={() => toggleLayer(key)}
            className={`rounded-xl border p-3 text-left transition-all ${selectedLayers.includes(key) ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:bg-secondary/20'}`}>
            <Icon className={`h-4 w-4 mb-1.5 ${color}`} />
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* URL Input */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Target Platform URL</Label>
          <Input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://pressai.yourdomain.com" className="h-9 text-sm" disabled={running} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleScan} disabled={running || !url.trim()} variant="outline" className="gap-2">
            {running && tab === 'scan' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            Scan Vulnerabilities
          </Button>
          <Button onClick={handleApply} disabled={running || !url.trim()} className="gap-2">
            {running && tab === 'apply' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Apply All Protections
          </Button>
        </div>
      </div>

      {/* Anti-Scraping Alerts */}
      <AntiScrapingAlerts url={url} />

      {/* Status Alert System */}
      <StatusAlertSystem currentScore={result?.protection_score} hasNewResults={!!result} />

      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Score */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center col-span-2 sm:col-span-1">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" className={scoreRing} strokeWidth="3"
                    strokeDasharray={`${overallScore} ${100 - overallScore}`} strokeLinecap="round" />
                </svg>
                <p className={`text-xl font-bold mt-1 ${scoreColor}`}>{overallScore}/100</p>
                <p className="text-[10px] text-muted-foreground">Protection Score</p>
              </div>
              {result.layer_scores && Object.entries(result.layer_scores).slice(0, 3).map(([key, val]) => (
                <div key={key} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className={`text-2xl font-bold mt-1 ${val >= 80 ? 'text-emerald-400' : val >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{val}</p>
                </div>
              ))}
            </div>

            {/* Vulnerabilities Found */}
            {result.vulnerabilities?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" /> Vulnerabilities ({result.vulnerabilities.length})
                </h3>
                {result.vulnerabilities.map((v, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className={`rounded-lg border p-3 flex gap-3 ${SEV_STYLE[v.severity] || SEV_STYLE.low}`}>
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">{v.title}</p>
                      <p className="text-[10px] opacity-80 mt-0.5">{v.description}</p>
                      {v.fix && <p className="text-[10px] text-primary mt-1">Fix: {v.fix}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Applied Protections */}
            {result.applied?.length > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Protections Applied ({result.applied.length})
                </h3>
                {result.applied.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> {item}
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Recommendations
                </h3>
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-primary font-bold shrink-0">{i + 1}.</span> {rec}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}