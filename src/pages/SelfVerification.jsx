import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Loader2, CheckCircle2, AlertCircle, Zap, BarChart3,
  ChevronDown, Copy, Download, RefreshCw, Rocket
} from 'lucide-react';
import CostControls from '@/components/verification/CostControls';
import CostSummary from '@/components/verification/CostSummary';
import { useJobs } from '@/lib/JobContext';
import { runAutopilotJob } from '@/lib/jobRunners';

const APPS = [
  {
    name: 'Buffer',
    description: 'Social media scheduling platform with post management, scheduling, and multi-channel publishing.',
    components: ['Post Form', 'Post List', 'Schedule Calendar', 'Channel Selector'],
    apis: ['GET /api', 'POST /api/run', 'GET /posts', 'POST /schedule'],
  },
  {
    name: 'ContentGenius',
    description: 'AI-powered content generation with history, examples, and export functionality.',
    components: ['Prompt Input', 'Result Panel', 'History Sidebar', 'Example Prompts'],
    apis: ['GET /api', 'POST /api/run', 'POST /generate'],
  },
  {
    name: 'ShopHub',
    description: 'E-commerce marketplace with product grid, shopping cart, and checkout workflow.',
    components: ['Product Grid', 'Product Card', 'Shopping Cart', 'Checkout Form'],
    apis: ['GET /api', 'POST /api/run', 'GET /products', 'POST /checkout'],
  },
  {
    name: 'BlogHub',
    description: 'Blogging platform with article creation, editing, search, and categorization.',
    components: ['Article Form', 'Article List', 'Search Bar', 'Category Filter'],
    apis: ['GET /api', 'POST /api/run', 'POST /articles', 'DELETE /articles/:id'],
  },
  {
    name: 'NotionHub',
    description: 'Personal workspace with notes, tasks, and link management across sections.',
    components: ['Notes Section', 'Tasks Section', 'Links Section', 'Section Switcher'],
    apis: ['GET /api', 'POST /api/run', 'POST /save'],
  },
];

// Per-app status: 'pending' | 'running' | 'passed' | 'failed'
function initAppStates() {
  return APPS.map(a => ({ name: a.name, status: 'pending', result: null }));
}

function StatusBadge({ status }) {
  const cfg = {
    pending:  { bg: 'bg-gray-500/20',    text: 'text-gray-400',    label: 'Pending' },
    running:  { bg: 'bg-blue-500/20',    text: 'text-blue-400',    label: 'Running',  spin: true },
    passed:   { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Passed' },
    failed:   { bg: 'bg-red-500/20',     text: 'text-red-400',     label: 'Failed' },
  }[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status };

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 ${cfg.bg} ${cfg.text}`}>
      {cfg.spin && <Loader2 className="h-3 w-3 animate-spin" />}
      {cfg.label}
    </span>
  );
}

function AppRow({ appState, onRetry, isRetrying, expanded, onToggle }) {
  const { name, status, result } = appState;
  const borderCls =
    status === 'passed' ? 'border-emerald-500/40 bg-emerald-500/5' :
    status === 'failed' ? 'border-red-500/40 bg-red-500/5' :
    status === 'running' ? 'border-primary/30 bg-primary/5' :
    'border-border bg-card';

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 space-y-2 ${borderCls}`}>
      <div className="flex items-center gap-3">
        {status === 'running' && <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />}
        {status === 'passed'  && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
        {status === 'failed'  && <AlertCircle  className="h-4 w-4 text-red-400 shrink-0" />}
        {status === 'pending' && <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />}

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">{name}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {status === 'running' && 'Generating, deploying, and validating…'}
            {status === 'passed'  && `✓ Passed in ${result?.iteration} iteration(s) — ${result?.finalUrl || ''}`}
            {status === 'failed'  && `✗ Failed after ${result?.iteration || '?'} iteration(s)`}
            {status === 'pending' && 'Waiting…'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={status} />
          {status === 'failed' && (
            <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 gap-1"
              onClick={() => onRetry(name)} disabled={isRetrying}>
              {isRetrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Retry
            </Button>
          )}
          {result && (
            <button onClick={onToggle} className="text-muted-foreground hover:text-foreground transition">
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {expanded && result && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="pt-3 border-t border-border space-y-3">
          {result.finalUrl && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Live URL</p>
              <a href={result.finalUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline break-all font-mono">{result.finalUrl}</a>
            </div>
          )}
          {result.iterationLog?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-foreground">Iterations</p>
              {result.iterationLog.map((log, i) => (
                <div key={i} className={`p-2 rounded border text-[10px] ${log.passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                  <div className="flex justify-between mb-1">
                    <span className="font-bold">Iteration {log.iteration}</span>
                    <span className={log.passed ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {log.passed ? '✓ PASSED' : '✗ FAILED'}
                    </span>
                  </div>
                  {log.url && <p className="text-[9px] text-primary font-mono truncate">{log.url}</p>}
                  {log.error && <p className="text-[9px] text-red-400 font-mono mt-1">{log.error}</p>}
                  {log.failedChecks?.length > 0 && (
                    <div className="mt-1">
                      {log.failedChecks.map((c, ci) => (
                        <p key={ci} className="text-[9px] text-red-400 ml-2">• {c.name} ({c.details})</p>
                      ))}
                    </div>
                  )}
                  {log.costUsd > 0 && (
                    <p className="text-[9px] text-muted-foreground mt-1">${log.costUsd.toFixed(5)} — {log.tokens} tokens</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function SelfVerification() {
  const [appStates, setAppStates] = useState(initAppStates());
  const [running, setRunning] = useState(false);
  const [retryingApp, setRetryingApp] = useState(null);
  const [expandedApp, setExpandedApp] = useState(null);
  const [executionLog, setExecutionLog] = useState([]);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState('');
  const { createJob } = useJobs();

  // Cost controls
  const [mode, setMode] = useState('standard');
  const [maxCostPerRun, setMaxCostPerRun] = useState('');
  const [maxCostPerApp, setMaxCostPerApp] = useState('');

  // Aggregated cost state
  const [costs, setCosts] = useState(null);
  const [summary, setSummary] = useState(null);

  const addLog = (msg, type = 'info') =>
    setExecutionLog(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: msg, type }]);

  const setAppStatus = (name, status, result = null) =>
    setAppStates(prev => prev.map(a => a.name === name ? { ...a, status, result: result ?? a.result } : a));

  // Run a single app call and update state live
  const runApp = async (app) => {
    setAppStatus(app.name, 'running');
    addLog(`→ [${app.name}] Starting…`, 'info');

    const res = await base44.functions.invoke('runSingleApp', {
      app,
      mode,
      maxCostPerApp: maxCostPerApp ? parseFloat(maxCostPerApp) : null,
    });
    const data = res?.data;

    if (!data || data.error) {
      const msg = data?.error || 'Unknown error';
      setAppStatus(app.name, 'failed', { appName: app.name, passed: false, iteration: 0, iterationLog: [{ iteration: 1, passed: false, error: msg, timestamp: new Date().toISOString() }] });
      addLog(`✗ [${app.name}] Error: ${msg}`, 'error');
      return { passed: false, cost: 0, tokens: 0 };
    }

    setAppStatus(app.name, data.passed ? 'passed' : 'failed', data);

    if (data.passed) {
      addLog(`✓ [${app.name}] PASSED in ${data.iteration} iter — ${data.finalUrl}`, 'success');
    } else {
      addLog(`✗ [${app.name}] FAILED after ${data.iteration} iter`, 'error');
    }

    return { passed: data.passed, cost: data.appCost || 0, tokens: data.appTokens || 0 };
  };

  const runFullAutopilot = async () => {
    setRunning(true);
    setError(null);
    setExecutionLog([]);
    setAppStates(initAppStates());
    setSummary(null);
    setCosts(null);
    addLog('Full Autopilot started', 'info');

    // Create background job so progress persists across navigation
    const jobId = createJob({
      type: 'autopilot',
      label: `Autopilot — ${APPS.length} apps [${mode}]`,
      meta: { total: APPS.length, done: 0 },
    });

    let totalCost = 0;
    let totalTokens = 0;
    let totalDeployments = 0;
    let passed = 0;
    const appCosts = {};

    const runBudget = maxCostPerRun ? parseFloat(maxCostPerRun) : null;

    // Also run in background job tracker (fire and forget for navigation persistence)
    runAutopilotJob(jobId, {
      apps: APPS,
      mode,
      maxCostPerRun: maxCostPerRun || null,
      maxCostPerApp: maxCostPerApp || null,
    }).catch(() => {});

    for (const app of APPS) {
      if (runBudget && totalCost >= runBudget) {
        addLog(`⚠ Run cost limit $${runBudget} reached. Skipping ${app.name}.`, 'warn');
        setAppStatus(app.name, 'failed', {
          appName: app.name, passed: false, iteration: 0,
          iterationLog: [{ iteration: 0, passed: false, error: `Skipped: run cost limit $${runBudget} reached`, timestamp: new Date().toISOString() }],
        });
        continue;
      }

      setCurrentStep(`Running ${app.name} (${APPS.indexOf(app) + 1}/${APPS.length})…`);

      const result = await runApp(app);
      totalCost += result.cost;
      totalTokens += result.tokens;
      totalDeployments += 1;
      appCosts[app.name] = { costUsd: result.cost, tokens: result.tokens, deployments: 1 };
      if (result.passed) passed++;
    }

    const total = APPS.length;
    const failed = total - passed;

    setSummary({ total, passed, failed });
    setCosts({
      totalCostUsd: parseFloat(totalCost.toFixed(6)),
      totalTokens,
      deployments: totalDeployments,
      llmCalls: totalDeployments,
      appCosts,
    });

    addLog(`━━ FINAL: ${passed}/${total} APPS PASSED — $${totalCost.toFixed(5)} ━━`, passed === total ? 'success' : 'warn');
    setCurrentStep('');
    setRunning(false);
  };

  const retryApp = async (appName) => {
    const app = APPS.find(a => a.name === appName);
    if (!app) return;
    setRetryingApp(appName);
    setError(null);
    addLog(`↺ Retrying ${appName}…`, 'info');
    await runApp(app);
    setRetryingApp(null);
  };

  const copyLog = () => {
    navigator.clipboard.writeText(executionLog.map(l => `[${l.timestamp}] ${l.message}`).join('\n'));
  };

  const downloadReport = () => {
    const report = { timestamp: new Date().toISOString(), summary, costs, apps: appStates.map(a => ({ name: a.name, status: a.status, result: a.result })), executionLog };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowai-verification-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const allDone = !running && appStates.some(a => a.status !== 'pending');
  const passedCount = appStates.filter(a => a.status === 'passed').length;
  const failedCount = appStates.filter(a => a.status === 'failed').length;

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 mb-1">
          <Zap className="h-7 w-7 text-primary" />
          Self-Verification Engine
        </h1>
        <p className="text-sm text-muted-foreground">
          App-by-app autopilot: build → deploy → validate → fix (per app, no timeouts)
        </p>
      </motion.div>

      {/* Autopilot Button */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-lg border border-primary/30 bg-primary/5 p-8 space-y-4 text-center">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">One-Click Full Autopilot</p>
          <p className="text-xs text-muted-foreground">
            Each app runs as an independent call — no 504 timeouts, partial progress saved
          </p>
        </div>

        <Button onClick={runFullAutopilot} disabled={running} className="w-full gap-2" size="lg">
          {running ? <><Loader2 className="h-5 w-5 animate-spin" />Running ({passedCount + failedCount}/{APPS.length} done)…</> :
                     <><Rocket className="h-5 w-5" />Run Full Autopilot</>}
        </Button>

        {running && currentStep && (
          <div className="flex items-center gap-2 justify-center p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <p className="text-xs text-primary font-semibold">{currentStep}</p>
          </div>
        )}
      </motion.div>

      {/* Cost Controls */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card p-5">
        <CostControls mode={mode} setMode={setMode}
          maxCostPerRun={maxCostPerRun} setMaxCostPerRun={setMaxCostPerRun}
          maxCostPerApp={maxCostPerApp} setMaxCostPerApp={setMaxCostPerApp} />
      </motion.div>

      {/* Live App Progress — always visible once started */}
      {appStates.some(a => a.status !== 'pending') && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">App Progress</p>
            {allDone && (
              <span className={`text-xs font-bold ${passedCount === APPS.length ? 'text-emerald-400' : 'text-amber-400'}`}>
                {passedCount}/{APPS.length} Passed
              </span>
            )}
          </div>
          <div className="space-y-2">
            {appStates.map(appState => (
              <AppRow
                key={appState.name}
                appState={appState}
                onRetry={retryApp}
                isRetrying={retryingApp === appState.name}
                expanded={expandedApp === appState.name}
                onToggle={() => setExpandedApp(expandedApp === appState.name ? null : appState.name)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Pending apps before run */}
      {appStates.every(a => a.status === 'pending') && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-lg border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Apps to verify ({APPS.length})</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {APPS.map(app => (
              <div key={app.name} className="text-xs px-2 py-1 rounded bg-secondary/30 border border-border/30 text-foreground">
                {app.name}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Execution Log */}
      {executionLog.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <p className="text-xs font-semibold text-foreground uppercase">Execution Log</p>
            </div>
            <div className="flex gap-2">
              <button onClick={copyLog} className="p-1.5 rounded hover:bg-secondary transition text-muted-foreground hover:text-foreground" title="Copy log">
                <Copy className="h-4 w-4" />
              </button>
              <button onClick={downloadReport} className="p-1.5 rounded hover:bg-secondary transition text-muted-foreground hover:text-foreground" title="Download report">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto font-mono text-[10px] space-y-0.5 bg-secondary/30 rounded p-3 border border-border/30">
            {executionLog.map((log, i) => (
              <div key={i} className={
                log.type === 'success' ? 'text-emerald-400' :
                log.type === 'error'   ? 'text-red-400'     :
                log.type === 'warn'    ? 'text-amber-400'   : 'text-muted-foreground'
              }>
                <span className="text-muted-foreground/60">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Cost Summary */}
      {costs && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <CostSummary costs={costs} summary={summary} mode={mode} />
        </motion.div>
      )}

      {/* Final summary banner */}
      {summary && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border p-4 ${summary.passed === summary.total ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
          <div className="flex items-center gap-2">
            {summary.passed === summary.total
              ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              : <BarChart3 className="h-5 w-5 text-amber-400" />}
            <p className={`font-bold text-sm ${summary.passed === summary.total ? 'text-emerald-400' : 'text-amber-400'}`}>
              {summary.passed}/{summary.total} Apps Verified
            </p>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!running && appStates.every(a => a.status === 'pending') && (
        <div className="text-center py-16">
          <Zap className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Click "Run Full Autopilot" to begin</p>
        </div>
      )}
    </div>
  );
}