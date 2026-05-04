import { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import OrchestrationConfig from '@/components/pipeline/OrchestrationConfig';
import ExecutionLogPanel from '@/components/pipeline/ExecutionLogPanel';
import MultiAgentPanel from '@/components/pipeline/MultiAgentPanel';
import AutoQAPanel from '@/components/pipeline/AutoQAPanel';
import WebhookPanel from '@/components/pipeline/WebhookPanel';
import IntelligentMonitorPanel from '@/components/pipeline/IntelligentMonitorPanel';
import AgentCollaborationPanel from '@/components/pipeline/AgentCollaborationPanel';
import AuditExportPanel from '@/components/pipeline/AuditExportPanel';
import InteractivePipelineBuilder from '@/components/pipeline/InteractivePipelineBuilder';
import TeamWorkspacePanel from '@/components/pipeline/TeamWorkspacePanel';
import TemplatLibraryPanel from '@/components/pipeline/TemplatLibraryPanel';
import RealtimeCollabPanel from '@/components/pipeline/RealtimeCollabPanel';
import ErrorDebugPanel from '@/components/pipeline/ErrorDebugPanel';
import WorkflowVisualizer from '@/components/pipeline/WorkflowVisualizer';
import VersionControlPanel from '@/components/pipeline/VersionControlPanel';
import CostEstimationPanel from '@/components/pipeline/CostEstimationPanel';
import {
  Workflow, Play, Loader2, CheckCircle2, Settings2,
  ArrowRight, Globe, ExternalLink, Zap, FlaskConical, Webhook,
  Activity, MessagesSquare, FileDown, GitBranch, Users, BookOpen, Radio, Bug,
  LayoutDashboard, GitCommit, DollarSign
} from 'lucide-react';

const TABS = [
  { key: 'orchestrate', label: 'Orchestration',  icon: Workflow },
  { key: 'builder',     label: 'Builder',         icon: GitBranch },
  { key: 'templates',   label: 'Templates',       icon: BookOpen },
  { key: 'realtime',    label: 'Live Collab',     icon: Radio },
  { key: 'debug',       label: 'Error Debug',     icon: Bug },
  { key: 'visualizer',  label: 'Workflow',         icon: LayoutDashboard },
  { key: 'versions',    label: 'Version Control',  icon: GitCommit },
  { key: 'costs',       label: 'Cost Estimator',   icon: DollarSign },
  { key: 'agents',      label: 'Multi-Agent',    icon: Zap },
  { key: 'collab',      label: 'Collaborate',    icon: MessagesSquare },
  { key: 'team',        label: 'Team',            icon: Users },
  { key: 'qa',          label: 'Auto QA',         icon: FlaskConical },
  { key: 'monitor',     label: 'Monitoring',      icon: Activity },
  { key: 'export',      label: 'Export Reports',  icon: FileDown },
  { key: 'webhooks',    label: 'Webhooks',         icon: Webhook },
];

const EXECUTION_STEPS = ['Claude', 'Copilot', 'Base44', 'Replit', 'Playwright', 'Vercel'];

const STEP_COLORS = {
  'Claude':     'text-blue-400',
  'Copilot':    'text-emerald-400',
  'Base44':     'text-purple-400',
  'Replit':     'text-orange-400',
  'Playwright': 'text-amber-400',
  'Vercel':     'text-sky-400',
};

export default function Pipeline() {
  const [activeTab, setActiveTab] = useState('orchestrate');
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [liveUrl, setLiveUrl] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [finalStatus, setFinalStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    if (!input.trim()) return;
    setRunning(true);
    setLiveUrl(null);
    setFinalStatus(null);
    setError(null);

    try {
      const res = await base44.functions.invoke('orchestrate', { input });
      const data = res?.data;
      const result = data?.url || '';

      if (result.startsWith('FAILED:')) {
        setError(result);
        setFinalStatus('failed');
      } else {
        setLiveUrl(result);
        setFinalStatus('complete');
      }
    } catch (e) {
      setError(`FAILED: ${e.message}`);
      setFinalStatus('failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Workflow className="h-7 w-7 text-primary" />
              AI Orchestration OS
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              ChatGPT · Claude · Replit · Vercel · Base44 — all coordinated end-to-end
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.history.back()}>
              <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.location.href = '/'}>
              <Zap className="h-3.5 w-3.5" /> Home
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowConfig(v => !v)}>
              <Settings2 className="h-3.5 w-3.5" /> Config
            </Button>
          </div>
        </div>

        {/* Execution pipeline legend */}
        <div className="flex flex-wrap gap-3 mt-4">
          {EXECUTION_STEPS.map(step => (
            <span key={step} className={`text-[10px] font-semibold flex items-center gap-1 ${STEP_COLORS[step]}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />{step}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/30 border border-border w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Config Panel */}
      <AnimatePresence>
        {showConfig && (
          <OrchestrationConfig onClose={() => setShowConfig(false)} />
        )}
      </AnimatePresence>

      {activeTab === 'builder'   && <InteractivePipelineBuilder />}
      {activeTab === 'templates' && <TemplatLibraryPanel onUseTemplate={prompt => { setInput(prompt); setActiveTab('orchestrate'); }} />}
      {activeTab === 'realtime'  && <RealtimeCollabPanel />}
      {activeTab === 'debug'     && <ErrorDebugPanel />}
      {activeTab === 'visualizer' && <WorkflowVisualizer />}
      {activeTab === 'versions'   && <VersionControlPanel />}
      {activeTab === 'costs'      && <CostEstimationPanel />}
      {activeTab === 'agents'    && <MultiAgentPanel />}
      {activeTab === 'collab'    && <AgentCollaborationPanel />}
      {activeTab === 'team'      && <TeamWorkspacePanel />}
      {activeTab === 'qa'        && <AutoQAPanel />}
      {activeTab === 'monitor'   && <IntelligentMonitorPanel />}
      {activeTab === 'export'    && <AuditExportPanel />}
      {activeTab === 'webhooks'  && <WebhookPanel />}

      {/* Tab: Execution Engine */}
      {activeTab === 'orchestrate' && (<>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card p-6 space-y-5"
      >
        {/* Execution pipeline display */}
        <div className="flex flex-wrap items-center gap-1.5">
          {EXECUTION_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border border-border/60 bg-secondary/40 ${STEP_COLORS[step]}`}>
                {step}
              </span>
              {i < EXECUTION_STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">What do you want to build?</Label>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !running && handleRun()}
            placeholder='e.g. "Build and deploy a SaaS app for freelancers"'
            className="h-9 text-sm"
            disabled={running}
          />
        </div>

        <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={handleRun} disabled={running || !input.trim()}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'Executing pipeline...' : 'Run Execution Engine'}
        </Button>
      </motion.div>

      {/* Running */}
      {running && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-lg border border-primary/30 bg-primary/5 p-5 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Executing pipeline...</p>
            <p className="text-xs text-muted-foreground mt-0.5">Claude → Copilot → Base44 → Replit → Playwright → Vercel</p>
          </div>
        </motion.div>
      )}

      {/* Result */}
      <AnimatePresence>
        {finalStatus === 'complete' && liveUrl && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              <p className="text-lg font-bold text-emerald-400 font-mono">{liveUrl}</p>
            </div>
            <a href={liveUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Globe className="h-4 w-4" /> Open deployment <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        )}

        {finalStatus === 'failed' && error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
            <p className="text-sm font-mono text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!running && !finalStatus && (
        <div className="text-center py-16 space-y-3">
          <Zap className="h-12 w-12 text-muted-foreground/20 mx-auto" />
          <p className="text-muted-foreground text-sm">Enter a prompt and run the execution engine</p>
          <p className="text-xs text-muted-foreground/60">Claude → Copilot → Base44 → Replit → Playwright → Vercel</p>
        </div>
      )}
      </>)}
    </div>
  );
}