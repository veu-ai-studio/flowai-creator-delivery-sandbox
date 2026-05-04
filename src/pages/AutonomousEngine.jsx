import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useJobs } from '@/lib/JobContext';
import { pushJobUpdate } from '@/lib/JobContext';
import { Button } from '@/components/ui/button';
import {
  Loader2, Shield, Wrench, TrendingUp,
  ArrowUpCircle, Zap, AlertCircle, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import MasterControlCard from '@/components/governance/MasterControlCard';
import SessionStatusBar from '@/components/governance/SessionStatusBar';
import GovernanceSessionRunner from '@/components/governance/GovernanceSessionRunner';
import ProtectBadge from '@/components/governance/ProtectBadge';
import { useSession } from '@/lib/SessionContext';

import SystemStatusBar from '@/components/autonomous/SystemStatusBar';
import IssueQueue from '@/components/autonomous/IssueQueue';
import HealLog from '@/components/autonomous/HealLog';
import OptimizationLog from '@/components/autonomous/OptimizationLog';
import UpgradeHistory from '@/components/autonomous/UpgradeHistory';
import CycleLog from '@/components/autonomous/CycleLog';

const TABS = [
  { id: 'issues',   label: 'Issue Queue',     Icon: AlertCircle },
  { id: 'heal',     label: 'Heal Log',        Icon: Wrench },
  { id: 'optimize', label: 'Optimize Log',    Icon: TrendingUp },
  { id: 'upgrade',  label: 'Upgrade History', Icon: ArrowUpCircle },
  { id: 'cycle',    label: 'Cycle Log',       Icon: Zap },
];

const ACTION_BUTTONS = [
  { action: 'scan',       label: 'Self-Test',     Icon: Search,        variant: 'outline' },
  { action: 'heal_all',   label: 'Self-Heal',     Icon: Wrench,        variant: 'outline' },
  { action: 'optimize',   label: 'Self-Optimize', Icon: TrendingUp,    variant: 'outline' },
  { action: 'upgrade',    label: 'Self-Upgrade',  Icon: ArrowUpCircle, variant: 'outline' },
  { action: 'full_cycle', label: 'Full Cycle',    Icon: Zap,           variant: 'default' },
];

export default function AutonomousEngine() {
  const { createJob } = useJobs();
  const { activeSession, pauseSession } = useSession();
  const [showMCC, setShowMCC] = useState(true);
  const [isReconfiguring, setIsReconfiguring] = useState(false);
  const [protectionActive, setProtectionActive] = useState(false);

  // All results live here — written by job runners
  const [activeAction, setActiveAction] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [lastCost, setLastCost] = useState(null);
  const [lastTokens, setLastTokens] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('issues');

  const [issues, setIssues] = useState([]);
  const [healLog, setHealLog] = useState([]);
  const [optimizations, setOptimizations] = useState(null);
  const [upgrades, setUpgrades] = useState(null);
  const [cycleLog, setCycleLog] = useState([]);
  const [cycleStats, setCycleStats] = useState(null); // { rejectedPatches, issuesConsidered, issuesSelected, minThreshold, totalUserImpactGained, totalBusinessImpactGained, valueSummary }
  const [modules, setModules] = useState([]);
  const [healingId, setHealingId] = useState(null);
  const [healedIds, setHealedIds] = useState(new Set());

  // Resolved IDs for deduplication (passed to backend)
  const [resolvedIds, setResolvedIds] = useState([]);
  const [currentScore, setCurrentScore] = useState(70);

  const invoke = (action, payload = {}) =>
    base44.functions.invoke('autonomousEngine', { action, ...payload });

  // ── Self-Test ────────────────────────────────────────────────────────────────
  const runScan = useCallback(async () => {
    setActiveAction('scan');
    setSystemStatus('running');
    setError(null);
    const jobId = createJob({ type: 'autonomous', label: 'Self-Test Scan' });
    pushJobUpdate(jobId, { status: 'running', progress: 10 });
    try {
      const res = await invoke('scan');
      const d = res?.data;
      if (d?.error) throw new Error(d.error);
      setIssues(d.all_issues || []);
      setModules(d.modules || []);
      setHealthScore(d.health_score);
      setCurrentScore(d.health_score || 70);
      setSystemStatus(d.system_status || 'issues_detected');
      setLastScan(new Date().toLocaleTimeString());
      setLastCost(d.cost_usd);
      setLastTokens(d.tokens_used);
      setActiveTab('issues');
      pushJobUpdate(jobId, { status: 'completed', progress: 100, completedAt: new Date().toISOString(), result: d });
    } catch (e) {
      setError(e.message);
      setSystemStatus('failed');
      pushJobUpdate(jobId, { status: 'failed', error: e.message, completedAt: new Date().toISOString(), progress: 100 });
    }
    setActiveAction(null);
  }, [createJob, resolvedIds]);

  // ── Heal single issue ────────────────────────────────────────────────────────
  const healIssue = useCallback(async (issue) => {
    const key = issue.id || issue.title;
    if (healedIds.has(key)) return; // dedup guard in UI too
    setHealingId(key);
    setSystemStatus('healing');
    setError(null);
    try {
      const res = await invoke('heal', { issue, currentScore, resolvedIds });
      const d = res?.data;
      if (d?.error) throw new Error(d.error);
      if (!d.skipped) {
        setHealLog(prev => [d, ...prev]);
        if (d.healed) {
          setHealedIds(prev => new Set([...prev, key]));
          setResolvedIds(prev => [...prev, key]);
          setCurrentScore(d.finalScore || currentScore);
          setHealthScore(d.finalScore || healthScore);
        }
      }
      setActiveTab('heal');
      setSystemStatus(d.healed ? 'healthy' : 'issues_detected');
    } catch (e) {
      setError(e.message);
      setSystemStatus('issues_detected');
    }
    setHealingId(null);
  }, [currentScore, healedIds, resolvedIds, healthScore]);

  // ── Heal all auto-eligible ───────────────────────────────────────────────────
  const healAll = useCallback(async () => {
    const eligible = issues.filter(i => i.auto_fix_eligible && !healedIds.has(i.id || i.title));
    if (!eligible.length) {
      setError('No auto-fix-eligible issues. Run Self-Test first.');
      return;
    }
    setActiveAction('heal_all');
    setSystemStatus('healing');
    setError(null);
    const jobId = createJob({ type: 'autonomous', label: `Self-Heal (${eligible.length} issues)` });
    pushJobUpdate(jobId, { status: 'running', progress: 5 });
    for (let i = 0; i < Math.min(eligible.length, 3); i++) {
      pushJobUpdate(jobId, { progress: Math.round(((i + 1) / 3) * 90) });
      await healIssue(eligible[i]);
    }
    pushJobUpdate(jobId, { status: 'completed', progress: 100, completedAt: new Date().toISOString() });
    setActiveAction(null);
  }, [issues, healedIds, healIssue, createJob]);

  // ── Optimize ─────────────────────────────────────────────────────────────────
  const runOptimize = useCallback(async () => {
    setActiveAction('optimize');
    setSystemStatus('optimizing');
    setError(null);
    const jobId = createJob({ type: 'autonomous', label: 'Self-Optimize' });
    pushJobUpdate(jobId, { status: 'running', progress: 20 });
    try {
      const res = await invoke('optimize', { currentScore });
      const d = res?.data;
      if (d?.error) throw new Error(d.error);
      setOptimizations({
        optimizations: d.optimizations || [],
        currentMetrics: d.current_metrics,
        projectedMetrics: d.projected_metrics,
        totalSavings: d.total_estimated_savings,
        timestamp: d.timestamp,
        initialScore: d.initialScore,
        finalScore: d.finalScore,
        improvement: d.improvement,
        rolledBack: d.rolledBack,
      });
      if (d.finalScore > currentScore) setCurrentScore(d.finalScore);
      setActiveTab('optimize');
      setSystemStatus(d.rolledBack ? 'issues_detected' : 'healthy');
      pushJobUpdate(jobId, { status: 'completed', progress: 100, completedAt: new Date().toISOString(), result: d });
    } catch (e) {
      setError(e.message);
      setSystemStatus('issues_detected');
      pushJobUpdate(jobId, { status: 'failed', error: e.message, completedAt: new Date().toISOString(), progress: 100 });
    }
    setActiveAction(null);
  }, [createJob, currentScore]);

  // ── Upgrade ──────────────────────────────────────────────────────────────────
  const runUpgrade = useCallback(async () => {
    setActiveAction('upgrade');
    setSystemStatus('upgrading');
    setError(null);
    const jobId = createJob({ type: 'autonomous', label: 'Self-Upgrade' });
    pushJobUpdate(jobId, { status: 'running', progress: 20 });
    try {
      const res = await invoke('upgrade', { currentScore });
      const d = res?.data;
      if (d?.error) throw new Error(d.error);
      setUpgrades({
        upgrades: d.upgrades || [],
        versionTag: d.version_tag,
        summary: d.summary,
        timestamp: d.timestamp,
        initialScore: d.initialScore,
        finalScore: d.finalScore,
        improvement: d.improvement,
        rolledBack: d.rolledBack,
      });
      if (d.finalScore > currentScore) setCurrentScore(d.finalScore);
      setActiveTab('upgrade');
      setSystemStatus(d.rolledBack ? 'issues_detected' : 'healthy');
      pushJobUpdate(jobId, { status: 'completed', progress: 100, completedAt: new Date().toISOString(), result: d });
    } catch (e) {
      setError(e.message);
      setSystemStatus('issues_detected');
      pushJobUpdate(jobId, { status: 'failed', error: e.message, completedAt: new Date().toISOString(), progress: 100 });
    }
    setActiveAction(null);
  }, [createJob, currentScore]);

  // ── Full Cycle ───────────────────────────────────────────────────────────────
  const runFullCycle = useCallback(async () => {
    setActiveAction('full_cycle');
    setSystemStatus('running');
    setError(null);
    setHealLog([]);
    setCycleLog([]);
    const jobId = createJob({ type: 'autonomous', label: 'Full Autonomous Cycle' });
    pushJobUpdate(jobId, { status: 'running', progress: 5 });
    try {
      const res = await invoke('full_cycle', {
        resolvedIds,
        startingScore: currentScore,
      });
      const d = res?.data;
      if (d?.error) throw new Error(d.error);

      // Populate all sections from single response
      setIssues(d.scan?.all_issues || []);
      setModules(d.scan?.modules || []);
      setHealthScore(d.finalScore);
      setCurrentScore(d.finalScore || currentScore);
      setHealLog(d.heal_results || []);
      setOptimizations({
        optimizations: d.optimizations || [],
        currentMetrics: d.current_metrics,
        projectedMetrics: d.projected_metrics,
        timestamp: d.timestamp,
        initialScore: d.initialScore,
        finalScore: d.finalScore,
        improvement: d.improvement,
        rolledBack: d.rolledBack,
      });
      setUpgrades({
        upgrades: d.upgrades || [],
        versionTag: d.upgrade_version,
        summary: d.upgrade_summary,
        timestamp: d.timestamp,
        initialScore: d.initialScore,
        finalScore: d.finalScore,
      });
      setCycleLog(d.cycle_log || []);
      setCycleStats({
        rejectedPatches: d.rejectedPatches || [],
        issuesConsidered: d.issuesConsidered,
        issuesSelected: d.issuesSelected,
        minThreshold: d.min_improvement_threshold,
        totalUserImpactGained: d.totalUserImpactGained,
        totalBusinessImpactGained: d.totalBusinessImpactGained,
        valueSummary: d.valueSummary,
      });
      setResolvedIds(d.resolved_ids || resolvedIds);
      if (d.heal_results) {
        const newHealed = new Set(healedIds);
        d.heal_results.filter(r => r.healed).forEach(r => newHealed.add(r.issue?.id || r.issue?.title));
        setHealedIds(newHealed);
      }
      setLastScan(new Date().toLocaleTimeString());
      setLastCost(d.cost_usd);
      setLastTokens(d.tokens_used);
      setSystemStatus(d.rolledBack ? 'issues_detected' : 'healthy');
      setActiveTab('cycle');

      pushJobUpdate(jobId, {
        status: 'completed', progress: 100, completedAt: new Date().toISOString(),
        result: { summary: `${d.initialScore} → ${d.finalScore} (+${d.improvement})`, improvement: d.improvement, rolledBack: d.rolledBack },
      });
    } catch (e) {
      setError(e.message);
      setSystemStatus('failed');
      pushJobUpdate(jobId, { status: 'failed', error: e.message, completedAt: new Date().toISOString(), progress: 100 });
    }
    setActiveAction(null);
  }, [createJob, currentScore, resolvedIds, healedIds]);

  const handleAction = (action) => {
    if (action === 'scan')       return runScan();
    if (action === 'heal_all')   return healAll();
    if (action === 'optimize')   return runOptimize();
    if (action === 'upgrade')    return runUpgrade();
    if (action === 'full_cycle') return runFullCycle();
  };

  const isLoading = activeAction !== null;
  const tabCounts = {
    issues: issues.length,
    heal: healLog.length,
    optimize: optimizations?.optimizations?.length || 0,
    upgrade: upgrades?.upgrades?.length || 0,
    cycle: cycleLog.length,
  };
  const hasData = issues.length > 0 || healLog.length > 0 || optimizations || upgrades || cycleLog.length > 0;

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <SessionStatusBar />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 mb-1">
          <Shield className="h-7 w-7 text-primary" />
          Autonomous Engine
        </h1>
        <p className="text-sm text-muted-foreground">
          Patch-only · Score-gated · Auto-rollback · Deduplicated — self-test, self-heal, self-optimize, self-upgrade
        </p>
      </motion.div>

      {/* Master Control Card */}
      {!activeSession ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {showMCC ? (
            <MasterControlCard onLaunched={() => setShowMCC(false)} />
          ) : (
            <button onClick={() => setShowMCC(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/40 text-primary text-sm hover:bg-primary/5 transition-all">
              <Zap className="h-4 w-4" /> Configure New Governance Session
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-400 font-semibold">
            <Zap className="h-4 w-4" /> Governance session active — {activeSession.urls?.length} URL{activeSession.urls?.length !== 1 ? 's' : ''} in progress
          </div>
          <div className="flex items-center gap-2">
            {isReconfiguring ? (
              <button onClick={() => setIsReconfiguring(false)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ChevronUp className="h-3.5 w-3.5" /> Cancel Reconfigure
              </button>
            ) : (
              <button onClick={() => { pauseSession(); setIsReconfiguring(true); }}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 border border-primary/30 rounded px-2 py-1">
                <ChevronDown className="h-3.5 w-3.5" /> Reconfigure
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Reconfigure panel — MCC in edit mode while session is paused */}
      {activeSession && isReconfiguring && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <MasterControlCard
            onLaunched={() => { setIsReconfiguring(false); }}
            resumeMode
            initialSettings={activeSession}
          />
        </motion.div>
      )}

      {/* Protection badge */}
      {protectionActive && (
        <div className="flex justify-end">
          <ProtectBadge protectionActive={protectionActive} />
        </div>
      )}

      {/* Session Runner — shows when active session has gated activities */}
      {activeSession && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <GovernanceSessionRunner />
        </motion.div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Manual Actions</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Status bar */}
      {systemStatus && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <SystemStatusBar
            status={isLoading ? 'running' : systemStatus}
            healthScore={healthScore}
            issueCount={issues.length}
            lastScan={lastScan}
            costUsd={lastCost}
            tokensUsed={lastTokens}
          />
        </motion.div>
      )}

      {/* Score display when active */}
      {healthScore != null && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Current score: <strong className="text-foreground">{currentScore}</strong></span>
          <span>·</span>
          <span>Resolved issues: <strong className="text-emerald-400">{resolvedIds.length}</strong></span>
        </div>
      )}

      {/* Action buttons */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Autonomous Actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ACTION_BUTTONS.map(({ action, label, Icon, variant }) => (
              <Button
                key={action}
                variant={variant}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handleAction(action)}
                disabled={isLoading}
              >
                {activeAction === action
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Icon className="h-3.5 w-3.5" />}
                {label}
              </Button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            All actions: patch-only · score-gated · auto-rollback · results persist via job system
          </p>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-lg border border-red-500/40 bg-red-500/5 p-4 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </motion.div>
      )}

      {/* Module grid */}
      {modules.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Module Coverage ({modules.length})</p>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
            {modules.map(m => {
              const hasIssue = issues.some(i => i.module === m.name);
              const isResolved = issues.filter(i => i.module === m.name).every(i => healedIds.has(i.id || i.title));
              return (
                <div key={m.id} className={`text-[9px] px-2 py-1 rounded border flex items-center gap-1 ${
                  isResolved && hasIssue ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                  : hasIssue ? 'border-amber-500/30 bg-amber-500/5 text-amber-400'
                  : 'border-border/30 bg-secondary/20 text-muted-foreground'
                }`}>
                  <span className="truncate">{m.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabbed results */}
      {hasData && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex border-b border-border gap-1 overflow-x-auto">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {tabCounts[id] > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === id ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {tabCounts[id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {activeTab === 'issues' && (
                <IssueQueue issues={issues} onHeal={healIssue} healingId={healingId} healedIds={healedIds} />
              )}
              {activeTab === 'heal' && <HealLog entries={healLog} />}
              {activeTab === 'optimize' && (optimizations
                ? <OptimizationLog {...optimizations} />
                : <div className="text-center py-8 text-muted-foreground text-sm">Run Self-Optimize or Full Cycle</div>
              )}
              {activeTab === 'upgrade' && (upgrades
                ? <UpgradeHistory {...upgrades} />
                : <div className="text-center py-8 text-muted-foreground text-sm">Run Self-Upgrade or Full Cycle</div>
              )}
              {activeTab === 'cycle' && <CycleLog log={cycleLog} {...(cycleStats || {})} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}

      {/* Empty state */}
      {!isLoading && !systemStatus && !error && (
        <div className="text-center py-20">
          <Shield className="h-14 w-14 text-muted-foreground/15 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm mb-1">FlowAI is standing by</p>
          <p className="text-muted-foreground/50 text-xs">Run Full Cycle to test, heal, optimize, and upgrade in one shot</p>
        </div>
      )}
    </div>
  );
}