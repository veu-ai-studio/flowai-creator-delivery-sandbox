import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { asArray } from '@/lib/uiDataGuards';
import { useJobs } from '@/lib/JobContext';
import { pushJobUpdate } from '@/lib/JobContext';
import { Button } from '@/components/ui/button';
import { Layers, Square, RotateCcw } from 'lucide-react';
import PortfolioInputPanel from '@/components/portfolio/PortfolioInputPanel';
import PortfolioStatusTable from '@/components/portfolio/PortfolioStatusTable';
import PortfolioSummaryPanel from '@/components/portfolio/PortfolioSummaryPanel';
import ProductRegistryPanel from '@/components/portfolio/ProductRegistryPanel';

const PARALLEL_LIMIT = 3;

export default function PortfolioEngine() {
  const { createJob } = useJobs();
  const [apps, setApps] = useState([]);
  const [running, setRunning] = useState(false);
  const [portfolioId] = useState(() => `pf_${Date.now()}`);
  const stopRef = useRef(false);

  const updateApp = useCallback((url, patch) => {
    setApps(prev => asArray(prev).map(a => a.url === url ? { ...a, ...patch } : a));
  }, []);

  const runSingleApp = useCallback(async (app, jobId) => {
    if (!app?.url) return null;
    updateApp(app.url, { status: 'running' });
    pushJobUpdate(jobId, { status: 'running', progress: 10, meta: { url: app.url, label: app.label } });

    try {
      const res = await base44.functions.invoke('portfolioEngine', {
        action: 'run_app',
        app: { url: app.url, label: app.label },
      });
      const d = res?.data;

      if (d?.error) throw new Error(d.error);

      const patch = {
        status: 'completed',
        initialScore: d.initialScore,
        finalScore: d.finalScore,
        improvement: d.improvement,
        userValueGained: d.userValueGained,
        businessValueGained: d.businessValueGained,
        rolledBack: d.rolledBack,
        healResults: d.healResults,
        cycleLog: d.cycleLog,
        summary: d.summary,
        issueCount: d.issueCount,
      };
      updateApp(app.url, patch);
      pushJobUpdate(jobId, {
        status: 'completed', progress: 100,
        completedAt: new Date().toISOString(),
        result: { improvement: d.improvement, finalScore: d.finalScore },
      });
      return patch;
    } catch (err) {
      updateApp(app.url, { status: 'failed', error: err.message });
      pushJobUpdate(jobId, {
        status: 'failed', error: err.message,
        completedAt: new Date().toISOString(), progress: 100,
      });
      return null;
    }
  }, [updateApp]);

  const runSequential = useCallback(async (appList) => {
    for (const app of asArray(appList)) {
      if (stopRef.current) {
        updateApp(app.url, { status: 'pending' });
        continue;
      }
      const jobId = createJob({ type: 'portfolio', label: `Portfolio: ${app.label}`, meta: { url: app.url } });
      await runSingleApp({ ...app, jobId }, jobId);
    }
  }, [createJob, runSingleApp, updateApp]);

  const runParallel = useCallback(async (appList) => {
    // Process in batches of PARALLEL_LIMIT
    const safeAppList = asArray(appList);
    for (let i = 0; i < safeAppList.length; i += PARALLEL_LIMIT) {
      if (stopRef.current) break;
      const batch = safeAppList.slice(i, i + PARALLEL_LIMIT);
      await Promise.all(batch.map(app => {
        const jobId = createJob({ type: 'portfolio', label: `Portfolio: ${app.label}`, meta: { url: app.url } });
        return runSingleApp({ ...app, jobId }, jobId);
      }));
    }
  }, [createJob, runSingleApp]);

  const handleStart = useCallback(async (appList, mode) => {
    const safeAppList = asArray(appList).filter((app) => app && typeof app.url === 'string' && app.url.trim());
    stopRef.current = false;
    setApps(safeAppList);
    setRunning(true);

    const rootJobId = createJob({
      type: 'portfolio',
      label: `Portfolio Run — ${safeAppList.length} apps [${mode}]`,
      meta: { total: safeAppList.length, mode },
    });
    pushJobUpdate(rootJobId, { status: 'running', progress: 5 });

    try {
      if (mode === 'parallel') {
        await runParallel(safeAppList);
      } else {
        await runSequential(safeAppList);
      }
      pushJobUpdate(rootJobId, { status: 'completed', progress: 100, completedAt: new Date().toISOString() });
    } catch (err) {
      pushJobUpdate(rootJobId, { status: 'failed', error: err.message, progress: 100 });
    }

    setRunning(false);
    stopRef.current = false;
  }, [createJob, runParallel, runSequential]);

  const handleStop = () => { stopRef.current = true; };
  const handleReset = () => { setApps([]); setRunning(false); stopRef.current = false; };

  const safeApps = asArray(apps);
  const hasApps = safeApps.length > 0;

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 mb-1">
              <Layers className="h-7 w-7 text-primary" />
              Portfolio Engine
            </h1>
            <p className="text-sm text-muted-foreground">
              Run Autonomous Engine cycles across multiple apps — orchestration and aggregation
            </p>
          </div>
          {hasApps && (
            <div className="flex gap-2 shrink-0">
              {running && (
                <Button variant="outline" size="sm" onClick={handleStop} className="gap-1.5 text-xs">
                  <Square className="h-3.5 w-3.5" /> Stop
                </Button>
              )}
              {!running && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Product Registry */}
      <AnimatePresence>
        {!hasApps && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ProductRegistryPanel onLoadIntoPortfolio={(appList) => handleStart(appList, 'sequential')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input panel — hide while running */}
      <AnimatePresence>
        {!hasApps && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PortfolioInputPanel onStart={handleStart} running={running} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-configure after reset */}
      {hasApps && !running && (
        <div className="text-xs text-muted-foreground">
          Portfolio ID: <code className="font-mono text-primary">{portfolioId}</code>
          {' · '}{safeApps.filter(a => a.status === 'completed').length}/{safeApps.length} completed
        </div>
      )}

      {/* Live status table */}
      <AnimatePresence>
        {hasApps && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <PortfolioStatusTable apps={safeApps} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary panel */}
      <AnimatePresence>
        {hasApps && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <PortfolioSummaryPanel apps={safeApps} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!hasApps && (
        <div className="text-center py-16">
          <Layers className="h-14 w-14 text-muted-foreground/15 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm mb-1">No portfolio running</p>
          <p className="text-muted-foreground/50 text-xs">Add app URLs above and start a portfolio run</p>
        </div>
      )}
    </div>
  );
}
