import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Zap, AlertTriangle, Clock, Activity,
  CreditCard, Loader2, CheckCircle2, ArrowRight,
  TrendingUp, MonitorCheck, Search
} from 'lucide-react';
import PlatformHealthWidget from '@/components/dashboard/PlatformHealthWidget';
import { formatDistanceToNow } from 'date-fns';
import { listProducts, normalizeScore, deriveSlug } from '@/lib/products/registry';
import { asArray, resolveArray } from '@/lib/uiDataGuards';

function Panel({ title, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 space-y-3 ${className}`}>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

function TrafficLight({ score }) {
  if (score == null) return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 inline-block" />;
  if (score >= 7) return <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />;
  if (score >= 5) return <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />;
}

function dashboardProductFromRegistry(product) {
  const rawScore = product?.last_score ?? product?.last_audit_score;
  const score = typeof rawScore === 'number' && rawScore <= 10 ? rawScore : normalizeScore(rawScore);
  const name = product?.name || product?.label || product?.product_name || product?.slug || 'Product';
  return {
    id: product?.id || product?.slug || deriveSlug(name),
    label: name,
    product_name: name,
    url: product?.live_url || product?.url || product?.canonical_url || '',
    last_score: score,
    last_run_at: product?.last_run_at || product?.last_audit_at || product?.updated_at || null,
  };
}

export default function MainDashboard() {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState([]);
  const [clearanceRecords, setClearanceRecords] = useState({});
  const [pendingJobs, setPendingJobs] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [autoSessions, setAutoSessions] = useState([]);
  const [guidedSessions, setGuidedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearingSessions, setClearingSession] = useState(false);
  const onboardingComplete = !!localStorage.getItem('flowai_onboarding_complete');

  // Fetch only active (in_progress / running) sessions
  const fetchSessions = async () => {
    const [autoS, guidedS] = await Promise.all([
      resolveArray(base44.entities.AutoSession.filter({ overall_status: 'running' }, '-started_at', 10)),
      resolveArray(base44.entities.GuidedSession.filter({ overall_status: 'in_progress' }, '-last_active_at', 10)),
    ]);
    setAutoSessions(autoS);
    setGuidedSessions(guidedS);
  };

  useEffect(() => {
    const load = async () => {
      const [productsResult, clearance, jobs, testReports, audits] = await Promise.all([
        listProducts({ sort: '-updated_at', limit: 20 }).catch((error) => ({ ok: false, error: error?.message || String(error) })),
        resolveArray(base44.entities.ClearanceRecord.list('-created_date')),
        resolveArray(base44.entities.Job.filter({ status: 'awaiting-review' }, '-created_date', 10)),
        resolveArray(base44.entities.TestReport.list('-created_date', 5)),
        resolveArray(base44.entities.QAAuditReport.list('-created_date', 5)),
      ]);
      const productItems = productsResult?.ok ? asArray(productsResult.items).map(dashboardProductFromRegistry) : [];
      setPortfolio(productItems);
      const clMap = {};
      asArray(clearance).forEach(r => { clMap[r.product_name] = r; });
      setClearanceRecords(clMap);
      setPendingJobs(jobs);
      const activity = [
        ...asArray(testReports).map(r => ({ type: 'Test', desc: `Self-test: ${r.target_url}`, score: `${r.test_score_percentage}%`, date: r.created_date })),
        ...asArray(audits).map(r => ({ type: 'Audit', desc: `Audit: ${r.url || 'unknown'}`, score: r.scores?.overall ? `${r.scores.overall}/10` : '—', date: r.created_date })),
      ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 10);
      setRecentActivity(activity);
      await fetchSessions();
      setLoading(false);
    };
    load();

    // 10-second polling for session progress updates
    const pollInterval = setInterval(fetchSessions, 10000);
    return () => clearInterval(pollInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate to session and store resume ID
  const resumeSession = (sessionId, type) => {
    try { sessionStorage.setItem('flowai_resume_session_id', sessionId); } catch {}
    if (type === 'auto') navigate('/auto-runner');
    else if (type === 'guided') navigate('/guided/research');
    else navigate('/manual/research');
  };

  const clearCompletedSessions = async () => {
    setClearingSession(true);
    // Delete any non-running auto sessions visible in local state
    const staleAuto = autoSessions.filter(s => s.overall_status !== 'running');
    const staleGuided = guidedSessions.filter(s => s.overall_status !== 'in_progress');
    await Promise.all([
      ...staleAuto.map(s => base44.entities.AutoSession.delete(s.id).catch(() => {})),
      ...staleGuided.map(s => base44.entities.GuidedSession.delete(s.id).catch(() => {})),
    ]);
    await fetchSessions();
    setClearingSession(false);
  };

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="h-7 w-7 text-primary" /> Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Command center — product health, sessions, gates, and quick actions</p>
          </div>
          {!onboardingComplete && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
              onClick={() => navigate('/onboarding')}>
              Complete Setup →
            </Button>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Panel 1 — Product Health */}
          <Panel title="My Products Health" className="lg:col-span-2">
            {portfolio.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Zap className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-muted-foreground">No products registered yet</p>
                <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
                  Create your first product from Workspace to start tracking health, scores, and session history here.
                </p>
                <Button size="sm" className="mt-1 gap-1.5 text-xs" onClick={() => navigate('/')}>
                  <Zap className="h-3.5 w-3.5" /> Create Your First Product
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {portfolio.map(p => {
                  const cl = clearanceRecords[p.label] || clearanceRecords[p.product_name] || null;
                  if (!cl && (p.label || p.product_name)) console.warn(`[Dashboard] No clearance match for: ${p.label || p.product_name}`);
                  return (
                    <div key={p.id} className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <TrafficLight score={p.last_score} />
                        <span className="text-sm font-semibold text-foreground truncate">{p.label || p.url}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Score: <span className={`font-bold ${p.last_score >= 7 ? 'text-emerald-400' : p.last_score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>{p.last_score != null ? `${p.last_score}/10` : '—'}</span></span>
                        <span>{cl?.overall_status === 'cleared' ? '🏆 Cleared' : cl ? `Step ${cl.current_step || 1}/6` : 'Not cleared'}</span>
                      </div>
                      {p.last_run_at && (
                        <p className="text-[9px] text-muted-foreground/60">Last run: {formatDistanceToNow(new Date(p.last_run_at), { addSuffix: true })}</p>
                      )}
                      <div className="flex gap-1">
                        <button onClick={() => navigate('/auto-runner')} className="flex-1 text-[9px] py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-all font-semibold">Auto</button>
                        <button onClick={() => navigate('/guided/research')} className="flex-1 text-[9px] py-1 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all font-semibold">Guided</button>
                        <button onClick={() => navigate('/manual/research')} className="flex-1 text-[9px] py-1 rounded border border-border text-muted-foreground hover:bg-secondary/30 transition-all font-semibold">Manual</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Panel 2 — Active Sessions (in_progress only, capped at 5 total) */}
          <Panel title="Active Sessions">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{autoSessions.length + guidedSessions.length} active</span>
              <button
                onClick={clearCompletedSessions}
                disabled={clearingSessions}
                className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors font-semibold flex items-center gap-1"
              >
                {clearingSessions ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Clear Completed
              </button>
            </div>
            {autoSessions.length === 0 && guidedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Activity className="h-6 w-6 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground font-semibold">No active sessions</p>
                <p className="text-[10px] text-muted-foreground/60 text-center">Start an Auto or Guided operation to see live session progress here.</p>
              </div>
            ) : (() => {
              // Merge and cap at 5 total
              const allSessions = [
                ...autoSessions.map(s => ({ ...s, _type: 'auto' })),
                ...guidedSessions.map(s => ({ ...s, _type: 'guided' })),
              ];
              const shown = allSessions.slice(0, 5);
              const hasMore = allSessions.length > 5;
              return (
                <div className="space-y-2">
                  {shown.map(s => s._type === 'auto' ? (
                    <button
                      key={s.id}
                      onClick={() => resumeSession(s.id, 'auto')}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all text-left"
                    >
                      <Zap className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{s.product_name}</p>
                        <p className="text-[10px] text-muted-foreground">Auto · Step {s.current_step}/8</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                    </button>
                  ) : (
                    <button
                      key={s.id}
                      onClick={() => resumeSession(s.id, 'guided')}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all text-left"
                    >
                      <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{s.product_name}</p>
                        <p className="text-[10px] text-muted-foreground">Guided · Step {s.current_step}/8</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-amber-400 shrink-0" />
                    </button>
                  ))}
                  {hasMore && (
                    <button
                      onClick={() => navigate('/auto-runner')}
                      className="w-full text-[10px] text-primary hover:text-primary/80 font-semibold py-1 text-center"
                    >
                      View All ({allSessions.length}) →
                    </button>
                  )}
                </div>
              );
            })()}
          </Panel>

          {/* Panel 3 — Pending Gates */}
          <Panel title="Pending Gates">
            {pendingJobs.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400 py-4 justify-center">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">No gates pending</span>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingJobs.slice(0, 5).map(job => (
                  <div key={job.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-red-500/20 bg-red-500/5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{job.type || 'Gate'}</p>
                      <p className="text-[10px] text-muted-foreground">{job.created_date ? formatDistanceToNow(new Date(job.created_date), { addSuffix: true }) : '—'}</p>
                    </div>
                    <button onClick={() => navigate('/autonomous-engine')} className="text-[10px] text-red-400 hover:text-red-300 shrink-0"><ArrowRight className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Panel 4 — Recent Activity */}
          <Panel title="Recent Activity">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <TrendingUp className="h-6 w-6 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground font-semibold">No activity yet</p>
                <p className="text-[10px] text-muted-foreground/60 text-center">Run a QA audit or self-test to see results here.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentActivity.slice(0, 8).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${a.type === 'Test' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>{a.type}</span>
                    <span className="text-muted-foreground truncate flex-1">{a.desc}</span>
                    <span className={`font-semibold shrink-0 ${a.score.includes('%') && parseInt(a.score) >= 80 ? 'text-emerald-400' : 'text-muted-foreground'}`}>{a.score}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Panel 5 — Quick Actions */}
          <Panel title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Start Auto Operation', icon: Zap, color: 'bg-primary text-primary-foreground hover:bg-primary/90', route: '/auto-runner' },
                { label: 'Start Guided Operation', icon: Clock, color: 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20', route: '/guided/research' },
                { label: 'Run Quality Audit', icon: Search, color: 'bg-secondary hover:bg-secondary/80 text-foreground border border-border', route: '/qa-audit' },
                { label: 'Check Product Health', icon: MonitorCheck, color: 'bg-secondary hover:bg-secondary/80 text-foreground border border-border', route: '/production-monitor' },
              ].map(a => (
                <button key={a.label} onClick={() => navigate(a.route)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${a.color}`}>
                  <a.icon className="h-3.5 w-3.5 shrink-0" />
                  {a.label}
                </button>
              ))}
            </div>
          </Panel>

          {/* Panel 7 — Platform Health */}
          <PlatformHealthWidget />

          {/* Panel 6 — Usage */}
          <Panel title="Usage and Billing">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Plan</span>
                <span className="text-foreground font-semibold">FlowAI Pro</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Token usage today</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden" />
                <p className="text-[10px] text-muted-foreground/60">Usage data unavailable</p>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8" onClick={() => navigate('/billing')}>
                <CreditCard className="h-3 w-3" /> View Billing Details
              </Button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
