import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { History, Trash2, ChevronDown, ChevronUp, ExternalLink, Play, Clock } from 'lucide-react';
import { listSessions, deleteSession } from '@/lib/flowaiClient';
import { STEPS } from '@/lib/operationsEngine';

const STATUS_STYLE = {
  running:   { label: '● Running',   color: 'text-blue-400',     border: 'border-blue-500/30' },
  paused:    { label: '⏸ Paused',    color: 'text-amber-400',    border: 'border-amber-500/30' },
  completed: { label: '✓ Completed', color: 'text-emerald-400',  border: 'border-emerald-500/30' },
  failed:    { label: '✗ Failed',    color: 'text-red-400',      border: 'border-red-500/30' },
};

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString();
}

function StepBadge({ stepKey, result }) {
  const step = STEPS.find(s => s.key === stepKey);
  if (!step || !result) return null;
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3 space-y-1.5">
      <p className="text-[11px] font-bold text-foreground">{step.label}</p>
      <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-auto">
        {(result.full_output || result.summary || '').slice(0, 1600)}
        {(result.full_output || '').length > 1600 ? '\n…' : ''}
      </pre>
    </div>
  );
}

function SessionCard({ session, onResume, onDelete, expanded, onToggleExpand }) {
  const status = STATUS_STYLE[session.status] || STATUS_STYLE.completed;
  const stepCount = Object.keys(session.stepResults || {}).length;
  const url = (session.inputs || []).filter(i => i.type === 'url').map(i => i.value)[0] || '';
  const description = (session.inputs || []).filter(i => i.type === 'description').map(i => i.value.slice(0, 80))[0] || '';

  return (
    <div className={`rounded-xl border ${status.border} bg-card overflow-hidden`}>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold ${status.color}`}>{status.label}</span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[11px] text-muted-foreground">{session.mode || 'auto'}</span>
              {session.objective && (
                <>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground truncate">{session.objective}</span>
                </>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground truncate">
              {url || description || 'Session ' + session.id}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatTime(session.startedAt)}
              {session.completedAt ? ` → ${formatTime(session.completedAt)}` : ''}
              {' · '}
              {stepCount} of {STEPS.length} steps complete
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {session.status !== 'completed' && (
              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1.5" onClick={() => onResume(session.id)}>
                <Play className="h-3 w-3" /> Resume
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-red-400" onClick={() => onDelete(session.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={() => onToggleExpand(session.id)}>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> {url}
          </a>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/30">
            <div className="p-4 space-y-3">
              {stepCount === 0 ? (
                <p className="text-[11px] text-muted-foreground">No step results captured yet.</p>
              ) : (
                STEPS.map(step => session.stepResults?.[step.key] && (
                  <StepBadge key={step.key} stepKey={step.key} result={session.stepResults[step.key]} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MySessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    setSessions(listSessions());
  }, []);

  const refresh = () => setSessions(listSessions());

  const handleResume = (id) => {
    sessionStorage.setItem('flowai_resume_session_id', id);
    navigate('/auto-runner');
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this session permanently?')) return;
    deleteSession(id);
    refresh();
  };

  return (
    <div className="p-8 lg:p-10 max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <History className="h-7 w-7 text-primary" /> My Sessions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every Auto Runner session is auto-saved to this browser. Click any session to view its full results, or resume an in-progress one.
        </p>
      </motion.div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
          <Button onClick={() => navigate('/')} className="gap-2"><Play className="h-4 w-4" /> Start a session</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <SessionCard
              key={s.id}
              session={s}
              onResume={handleResume}
              onDelete={handleDelete}
              expanded={expandedId === s.id}
              onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
