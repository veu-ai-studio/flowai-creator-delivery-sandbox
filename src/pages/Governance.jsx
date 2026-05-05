import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/SessionContext';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Clock, CheckCircle2, AlertTriangle,
  Loader2, BarChart3, Zap, GitBranch, RefreshCw, ExternalLink, Save, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

const SETTINGS_KEY = 'flowai_governance_settings';
const DEFAULT_SETTINGS = {
  score_drop_threshold: 10,
  optimize_threshold: 8,
  upgrade_gain_threshold: 10,
  high_risk_separate: true,
  auto_protect_on_heal: true,
  require_80pct_test_for_upgrade: true,
};

const GATE_LABELS = {
  'awaiting-review':   { label: 'Waiting for your review',          color: 'text-red-400',    border: 'border-red-500/30',   bg: 'bg-red-500/5' },
  'awaiting-approval': { label: 'Waiting for your approval',        color: 'text-red-400',    border: 'border-red-500/30',   bg: 'bg-red-500/5' },
  'prepared':          { label: 'Ready for you to test',            color: 'text-amber-400',  border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  'testing':           { label: 'Ready for your final acceptance',  color: 'text-blue-400',   border: 'border-blue-500/30',  bg: 'bg-blue-500/5' },
  'accepted':          { label: 'Accepted & locked',                color: 'text-emerald-400',border: 'border-emerald-500/30',bg: 'bg-emerald-500/5' },
  'rolled-back':       { label: 'Rolled back',                      color: 'text-red-400',    border: 'border-red-500/30',   bg: 'bg-red-500/5' },
};

const TOOL_MARKETPLACE = [
  { name: 'Playwright',   category: 'Testing',     desc: 'Browser automation & crawling' },
  { name: 'Lighthouse',   category: 'Performance', desc: 'Page performance scoring' },
  { name: 'axe-core',     category: 'Accessibility',desc: 'WCAG compliance checks' },
  { name: 'Claude 3.5',   category: 'AI',          desc: 'Analysis and reasoning' },
  { name: 'GPT-4o',       category: 'AI',          desc: 'Code generation and review' },
  { name: 'Voyage AI',    category: 'AI',          desc: 'Vector embeddings for search' },
  { name: 'Vercel',       category: 'Deploy',      desc: 'Serverless deployment' },
  { name: 'Replit',       category: 'Execute',     desc: 'Code execution environment' },
  { name: 'Supabase',     category: 'Data',        desc: 'Postgres persistence' },
  { name: 'Inngest',      category: 'Jobs',        desc: 'Background job orchestration' },
  { name: 'Resend',       category: 'Comms',       desc: 'Email delivery' },
  { name: 'Axiom',        category: 'Logging',     desc: 'Structured observability' },
  { name: 'Clerk',        category: 'Auth',        desc: 'Multi-tenant authentication' },
];

const TOOL_CAT_COLORS = {
  Testing:     'text-blue-400 bg-blue-400/10',
  Performance: 'text-amber-400 bg-amber-400/10',
  Accessibility:'text-purple-400 bg-purple-400/10',
  AI:          'text-primary bg-primary/10',
  Deploy:      'text-emerald-400 bg-emerald-400/10',
  Execute:     'text-cyan-400 bg-cyan-400/10',
  Data:        'text-indigo-400 bg-indigo-400/10',
  Jobs:        'text-violet-400 bg-violet-400/10',
  Comms:       'text-pink-400 bg-pink-400/10',
  Logging:     'text-muted-foreground bg-secondary',
  Auth:        'text-emerald-400 bg-emerald-400/10',
};

const PANELS = [
  { key: 'queue',       label: 'Active Queue',      icon: Shield },
  { key: 'audit',       label: 'Audit Log',         icon: BarChart3 },
  { key: 'renewal',     label: 'Self-Renewal',      icon: RefreshCw },
  { key: 'marketplace', label: 'Tool Marketplace',  icon: Zap },
  { key: 'timeline',    label: 'Timeline',          icon: Clock },
  { key: 'health',      label: 'System Health',     icon: CheckCircle2 },
  { key: 'tests',       label: 'Self-Test History', icon: CheckCircle2 },
  { key: 'settings',    label: 'Settings',          icon: Zap },
];

export default function Governance() {
  const [activePanel, setActivePanel] = useState('queue');
  const [jobs, setJobs] = useState([]);
  const [testReports, setTestReports] = useState([]);
  const [auditReports, setAuditReports] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [govSettings, setGovSettings] = useState(() => {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
    catch { return DEFAULT_SETTINGS; }
  });
  const { activeSession, formattedElapsed } = useSession();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const [[reviewJobs, approvalJobs], t, a, p, s] = await Promise.all([
      Promise.all([
        base44.entities.Job.filter({ status: 'awaiting-review' }, '-created_date', 20).catch(() => []),
        base44.entities.Job.filter({ status: 'awaiting-approval' }, '-created_date', 20).catch(() => []),
      ]),
      base44.entities.TestReport.list('-created_date', 20).catch(() => []),
      base44.entities.QAAuditReport.list('-created_date', 20).catch(() => []),
      base44.entities.ProductRegistry.list('-created_date').catch(() => []),
      base44.entities.GovernanceSession.list('-created_date', 30).catch(() => []),
    ]);
    // Deduplicate by id
    const seen = new Set();
    const allJobs = [...reviewJobs, ...approvalJobs].filter(j => {
      if (seen.has(j.id)) return false;
      seen.add(j.id);
      return true;
    }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setJobs(allJobs);
    setTestReports(t);
    setAuditReports(a);
    setPortfolio(p);
    setCompletedSessions(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(govSettings));
    // Also persist to database for cross-device durability
    const user = await base44.auth.me().catch(() => null);
    if (user?.email) {
      const existing = await base44.entities.GovernanceSettings.filter({ user_email: user.email }, '-created_date', 1).catch(() => []);
      if (existing[0]) {
        await base44.entities.GovernanceSettings.update(existing[0].id, { ...govSettings, user_email: user.email }).catch(() => {});
      } else {
        await base44.entities.GovernanceSettings.create({ ...govSettings, user_email: user.email }).catch(() => {});
      }
    }
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const gatedJobs = jobs.filter(j => Object.keys(GATE_LABELS).includes(j.status));

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" /> Governance Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Centralized governance control — active queue, history, health, and settings.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={load}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => navigate('/autonomous-engine')}>
              <Zap className="h-3.5 w-3.5" /> New Session
            </Button>
          </div>
        </div>

        {/* Live session banner */}
        {activeSession && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
              <Zap className="h-3.5 w-3.5 animate-pulse" />
              Active session — {activeSession.urls?.length} URL{activeSession.urls?.length !== 1 ? 's' : ''} · {activeSession.selected_activities?.join(', ')} · {formattedElapsed}
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-amber-500/30 text-amber-400"
              onClick={() => navigate('/autonomous-engine')}>
              <ExternalLink className="h-3 w-3" /> View
            </Button>
          </motion.div>
        )}

        {/* Stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          {[
            { label: 'Pending Gates',    value: gatedJobs.length,          color: gatedJobs.length > 0 ? 'text-red-400' : 'text-emerald-400' },
            { label: 'Self-Tests Run',   value: testReports.length,         color: 'text-foreground' },
            { label: 'Audits Run',       value: auditReports.length,        color: 'text-foreground' },
            { label: 'Sessions',         value: 0,                          color: 'text-foreground' },
            { label: 'Products',         value: portfolio.length,           color: 'text-foreground' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Panel tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {PANELS.map(({ key, label, icon: PanelIcon }) => (
          <button key={key} onClick={() => setActivePanel(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${activePanel === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <PanelIcon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <motion.div key={activePanel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>

          {/* ACTIVE QUEUE */}
          {activePanel === 'queue' && (
            <div className="space-y-3">
              {gatedJobs.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No items waiting — all governance actions complete.</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">Launch a session on Autonomous Engine to start.</p>
                </div>
              ) : (
                gatedJobs.map(job => {
                  const gateInfo = GATE_LABELS[job.status] || GATE_LABELS['awaiting-review'];
                  return (
                    <div key={job.id} className={`rounded-xl border p-4 space-y-2 ${gateInfo.border} ${gateInfo.bg}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 ${gateInfo.color}`} />
                          <p className={`text-sm font-bold ${gateInfo.color}`}>{gateInfo.label}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {job.created_date ? formatDistanceToNow(new Date(job.created_date), { addSuffix: true }) : '—'}
                        </span>
                      </div>
                      <p className="text-xs text-foreground">{job.type} — {job.error || 'Awaiting action'}</p>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                        onClick={() => navigate('/autonomous-engine')}>
                        <ExternalLink className="h-3 w-3" /> Go to Gate
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TIMELINE */}
          {activePanel === 'timeline' && (
            <div className="space-y-2">
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No governance history yet.</p>
              ) : (
                [...jobs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map((job, i) => {
                  const g = GATE_LABELS[job.status];
                  return (
                    <div key={job.id} className="flex gap-3 items-start">
                      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${g ? g.color.replace('text-', 'bg-') : 'bg-muted-foreground'}`} />
                      <div className="flex-1 text-xs border-b border-border/30 pb-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-foreground">{job.type}</span>
                          <span className="text-muted-foreground text-[10px]">{job.created_date ? formatDistanceToNow(new Date(job.created_date), { addSuffix: true }) : '—'}</span>
                        </div>
                        <p className="text-muted-foreground">{g?.label || job.status}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SYSTEM HEALTH */}
          {activePanel === 'health' && (
            <div className="space-y-3">
              {portfolio.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No products registered in Portfolio Engine yet.</p>
              ) : (
                portfolio.map(p => {
                  const score = p.last_score;
                  const color = score >= 8 ? 'text-emerald-400' : score >= 5 ? 'text-amber-400' : 'text-red-400';
                  const dot = score >= 8 ? 'bg-emerald-400' : score >= 5 ? 'bg-amber-400' : 'bg-red-400';
                  return (
                    <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${dot}`} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{p.label || p.url}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-48">{p.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {score != null ? <span className={`text-lg font-bold ${color}`}>{score}/10</span> : <span className="text-muted-foreground text-xs">No score yet</span>}
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={() => navigate('/autonomous-engine')}>
                          <Zap className="h-3 w-3" /> Session
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TEST HISTORY */}
          {activePanel === 'tests' && (
            <div className="space-y-2">
              {testReports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No Self-Test runs recorded yet.</p>
              ) : (
                testReports.map(r => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{r.target_url}</p>
                      {r.blocking_issues && <p className="text-[10px] text-red-400 truncate">{r.blocking_issues}</p>}
                      <p className="text-[10px] text-muted-foreground">{r.created_date ? formatDistanceToNow(new Date(r.created_date), { addSuffix: true }) : '—'}</p>
                    </div>
                    <div className={`text-xl font-bold ${r.test_score_percentage >= 80 ? 'text-emerald-400' : r.test_score_percentage >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {r.test_score_percentage}%
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* AUDIT HISTORY */}
          {activePanel === 'audits' && (
            <div className="space-y-2">
              {auditReports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No audit runs recorded yet.</p>
              ) : (
                auditReports.map(r => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{r.url}</p>
                      <p className="text-[10px] text-muted-foreground">{r.created_date ? formatDistanceToNow(new Date(r.created_date), { addSuffix: true }) : '—'}</p>
                    </div>
                    <div className={`text-xl font-bold ${(r.scores?.overall || 0) >= 7 ? 'text-emerald-400' : (r.scores?.overall || 0) >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                      {r.scores?.overall ?? '—'}/10
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* AUDIT LOG */}
          {activePanel === 'audit' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Paginated governance event log. All run starts, clearance decisions, product additions, and failures appear here.</p>
              {[...jobs, ...testReports.slice(0, 5), ...auditReports.slice(0, 5)]
                .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
                .slice(0, 20).map((item, i) => (
                  <div key={item.id || i} className="flex gap-3 items-start p-3 rounded-lg border border-border bg-card">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{item.type || item.target_url || item.url || '—'}</p>
                      <p className="text-[10px] text-muted-foreground">{item.status || item.test_score_percentage != null ? `Score: ${item.test_score_percentage}%` : item.scores?.overall ? `Score: ${item.scores.overall}/10` : ''}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {item.created_date ? formatDistanceToNow(new Date(item.created_date), { addSuffix: true }) : '—'}
                    </span>
                  </div>
                ))}
              {jobs.length === 0 && testReports.length === 0 && auditReports.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No governance events recorded yet.</p>
                </div>
              )}
            </div>
          )}

          {/* SELF-RENEWAL */}
          {activePanel === 'renewal' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Per-product self-renewal status. Trigger a new cycle or view last report.</p>
              {portfolio.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No products registered yet.</div>
              ) : portfolio.map(p => (
                <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.label || p.url}</p>
                    <p className="text-[10px] text-muted-foreground">Last renewal: {p.last_run_at ? formatDistanceToNow(new Date(p.last_run_at), { addSuffix: true }) : 'Never'}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => navigate('/guided/govern')}>
                    <RefreshCw className="h-3 w-3" /> Trigger Renewal
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* TOOL MARKETPLACE */}
          {activePanel === 'marketplace' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">FlowAI Tool Intelligence Marketplace — {TOOL_MARKETPLACE.length} tools across {new Set(TOOL_MARKETPLACE.map(t => t.category)).size} categories.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TOOL_MARKETPLACE.map(tool => {
                  const catStyle = TOOL_CAT_COLORS[tool.category] || 'text-muted-foreground bg-secondary';
                  return (
                    <div key={tool.name} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{tool.name}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${catStyle}`}>{tool.category}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{tool.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CAPABILITY TRANSFERS */}
          {activePanel === 'transfers' && (() => {
            const transfers = completedSessions.filter(s => s.capability_transfer?.transferred_at);
            return transfers.length === 0 ? (
              <div className="text-center py-16">
                <GitBranch className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No Capability Transfers logged yet.</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Transfers are recorded when Gate 4 is accepted on a session with Capability Transfer enabled.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transfers.map(s => {
                  const ct = s.capability_transfer;
                  return (
                    <div key={s.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground truncate">{ct.source_url}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {ct.transferred_at ? formatDistanceToNow(new Date(ct.transferred_at), { addSuffix: true }) : '—'}
                        </span>
                      </div>
                      {ct.items?.length > 0 && (
                        <ul className="space-y-0.5">
                          {ct.items.map((item, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                              <span className="text-primary shrink-0">→</span> {item}
                            </li>
                          ))}
                        </ul>
                      )}
                      {ct.confidence && (
                        <p className="text-[10px] text-muted-foreground">Confidence: <span className="text-foreground font-semibold">{ct.confidence}</span></p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* SETTINGS */}
          {activePanel === 'settings' && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h3 className="text-sm font-bold text-foreground">Governance Thresholds</h3>

              {/* Numeric thresholds */}
              <div className="space-y-3">
                {[
                  { key: 'score_drop_threshold',    label: 'Score drop triggering Self-Protect (points)', type: 'number' },
                  { key: 'optimize_threshold',       label: 'Audit score below which to trigger Self-Optimize (0–10)', type: 'number' },
                  { key: 'upgrade_gain_threshold',   label: 'Cumulative gain threshold to suggest Self-Upgrade (points)', type: 'number' },
                ].map(({ key, label, type }) => (
                  <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-border/30">
                    <p className="text-xs text-foreground flex-1">{label}</p>
                    <Input
                      type={type}
                      value={govSettings[key]}
                      onChange={e => setGovSettings(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="h-7 w-20 text-xs text-center"
                    />
                  </div>
                ))}
              </div>

              {/* Boolean toggles */}
              <div className="space-y-2">
                {[
                  { key: 'high_risk_separate',           label: 'High-risk items always require separate approval cycle', locked: true },
                  { key: 'auto_protect_on_heal',          label: 'Auto-run Self-Protect before Heal and Upgrade' },
                  { key: 'require_80pct_test_for_upgrade',label: 'Require 80%+ test score before Self-Upgrade' },
                ].map(({ key, label, locked }) => (
                  <label key={key} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${govSettings[key] ? 'border-primary/30 bg-primary/5' : 'border-border hover:bg-secondary/20'} ${locked ? 'opacity-80' : ''}`}>
                    <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${govSettings[key] ? 'border-primary bg-primary' : 'border-border bg-background'}`}
                      onClick={() => !locked && setGovSettings(prev => ({ ...prev, [key]: !prev[key] }))}>
                      {govSettings[key] && <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <span className="text-xs text-foreground flex-1">{label}</span>
                    {locked && <span className="text-[10px] text-muted-foreground">(locked ON)</span>}
                  </label>
                ))}
              </div>

              <Button size="sm" onClick={saveSettings} className="gap-2 w-full">
                {settingsSaved ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Save className="h-3.5 w-3.5" />}
                {settingsSaved ? 'Settings Saved' : 'Save Settings'}
              </Button>
            </div>
          )}

        </motion.div>
      )}
    </div>
  );
}