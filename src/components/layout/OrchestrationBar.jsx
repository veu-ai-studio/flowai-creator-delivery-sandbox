import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useOrchestration,
  AGENTIC_MODES, AGENTIC_MODE_LABELS,
  ITERATION_MODES, ITERATION_MODE_LABELS,
  FLOW_TYPES, FLOW_TYPE_LABELS,
} from '@/lib/OrchestrationContext';
import { useSession } from '@/lib/SessionContext';
import { useNavigate } from 'react-router-dom';
import { Settings2, ChevronDown, ChevronUp, Brain, RefreshCw, Workflow, Zap, Pause, Eye, X } from 'lucide-react';

const AGENTIC_COLORS = {
  supervised:      'text-blue-400 bg-blue-500/10 border-blue-500/30',
  semi_autonomous: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  autonomous:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

const ACTIVITY_LABELS = {
  self_test: 'Self-Test',
  self_audit: 'Self-Audit',
  self_protect: 'Self-Protect',
  self_heal: 'Self-Heal',
  self_optimize: 'Self-Optimize',
  self_upgrade: 'Self-Upgrade',
  capability_transfer: 'Cap. Transfer',
};

function Selector({ label, icon: Icon, value, options, labels, colors, onChange }) {
  const [open, setOpen] = useState(false);
  const activeColor = colors?.[value] || 'text-primary bg-primary/10 border-primary/30';
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[11px] font-semibold transition-all whitespace-nowrap ${activeColor}`}
      >
        {Icon && <Icon className="h-3 w-3" />}
        <span className="text-[10px] text-current/60 font-normal">{label}:</span>
        {labels[value] || value}
        {open ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-9 left-0 z-50 min-w-[140px] rounded-lg border border-border bg-card shadow-xl overflow-hidden"
          >
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary/50 ${
                  value === opt ? 'text-primary bg-primary/5' : 'text-foreground'
                }`}
              >
                {labels[opt] || opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Divider() {
  return <span className="h-4 w-px bg-border/60 shrink-0" />;
}

export default function OrchestrationBar() {
  const { agenticMode, setAgenticMode, iterationMode, setIterationMode, flowType, setFlowType } = useOrchestration();
  const { activeSession, pauseSession, cancelSession } = useSession();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  const { urls = [], current_activity, gates_pending = 0 } = activeSession || {};
  const activityLabel = ACTIVITY_LABELS[current_activity] || current_activity || '—';

  return (
    <div className="relative border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 py-2 gap-3 flex-shrink-0 overflow-visible" style={{minHeight: '42px'}}>

      {activeSession ? (
        /* ── SESSION ACTIVE: clean status bar ── */
        <>
          <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-pulse" />
          <span className="text-amber-400 font-bold text-sm shrink-0">Session Active</span>
          <Divider />
          <span className="text-sm text-muted-foreground shrink-0">
            URLs: <span className="text-foreground font-semibold">{urls.length}</span>
          </span>
          <Divider />
          <span className="text-sm text-muted-foreground shrink-0">
            Activity: <span className="text-primary font-semibold">{activityLabel}</span>
          </span>
          <Divider />
          {gates_pending > 0 && (
            <>
              <span className="text-sm text-amber-400 font-semibold shrink-0">Gates: {gates_pending} pending</span>
              <Divider />
            </>
          )}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button onClick={() => navigate('/autonomous-engine')}
              className="flex items-center gap-1 h-7 px-3 rounded border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
              <Eye className="h-3.5 w-3.5" /> View
            </button>
            <button onClick={pauseSession}
              className="flex items-center gap-1 h-7 px-3 rounded border border-amber-500/40 text-sm text-amber-400 hover:bg-amber-500/10 transition-all">
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
            <button onClick={cancelSession}
              className="flex items-center justify-center h-7 w-7 rounded border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/40 transition-all">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      ) : (
        /* ── NO SESSION: settings selectors ── */
        <>
          <button
            onClick={() => setShowSettings(v => !v)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="h-3 w-3" />
            {showSettings ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.12 }}
                className="flex items-center gap-2"
              >
                <Selector label="Mode" icon={Brain} value={agenticMode} options={Object.values(AGENTIC_MODES)} labels={AGENTIC_MODE_LABELS} colors={AGENTIC_COLORS} onChange={setAgenticMode} />
                <Selector label="Iteration" icon={RefreshCw} value={iterationMode} options={Object.values(ITERATION_MODES)} labels={ITERATION_MODE_LABELS} onChange={setIterationMode} />
                <Selector label="Flow" icon={Workflow} value={flowType} options={Object.values(FLOW_TYPES)} labels={FLOW_TYPE_LABELS} onChange={setFlowType} />
              </motion.div>
            )}
          </AnimatePresence>

          {!showSettings && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-emerald-400 font-semibold">FlowAI Ready</span>
              <span className="text-muted-foreground/40">·</span>
              <span>Mode: <span className="text-foreground font-medium">{AGENTIC_MODE_LABELS[agenticMode]}</span></span>
              <span className="text-muted-foreground/40">·</span>
              <span>Click <Settings2 className="inline h-3 w-3 mx-0.5" /> to configure</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${agenticMode === 'autonomous' ? 'bg-emerald-400 animate-pulse' : agenticMode === 'semi_autonomous' ? 'bg-amber-400' : 'bg-blue-400'}`} />
          </div>
        </>
      )}
    </div>
  );
}