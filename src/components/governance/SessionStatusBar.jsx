import { useSession } from '@/lib/SessionContext';
import { useNavigate } from 'react-router-dom';
import { Zap, Pause, Eye, X } from 'lucide-react';
import { motion } from 'framer-motion';

const ACTIVITY_LABELS = {
  self_test: 'Self-Test',
  self_audit: 'Self-Audit',
  self_protect: 'Self-Protect',
  self_heal: 'Self-Heal',
  self_optimize: 'Self-Optimize',
  self_upgrade: 'Self-Upgrade',
  capability_transfer: 'Cap. Transfer',
};

export default function SessionStatusBar() {
  const { activeSession, formattedElapsed, pauseSession, cancelSession } = useSession();
  const navigate = useNavigate();

  if (!activeSession) return null;

  const { urls = [], selected_activities = [], current_url_index = 0, current_activity, gates_pending = 0 } = activeSession;
  const currentUrl = urls[current_url_index];
  const activityLabel = ACTIVITY_LABELS[current_activity] || current_activity || '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-64 right-0 z-30 bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 flex items-center gap-4 text-xs"
    >
      <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
      <span className="text-amber-400 font-bold shrink-0">Session Active</span>
      <span className="text-muted-foreground shrink-0">URLs: <span className="text-foreground font-semibold">{urls.length}</span></span>
      <span className="text-muted-foreground shrink-0">Activity: <span className="text-primary font-semibold">{activityLabel}</span></span>
      {gates_pending > 0 && (
        <span className="text-amber-400 font-semibold shrink-0">Gates pending: {gates_pending}</span>
      )}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <button onClick={() => navigate('/autonomous-engine')}
          className="flex items-center gap-1 px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
          <Eye className="h-3 w-3" /> View
        </button>
        <button onClick={pauseSession}
          className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-all">
          <Pause className="h-3 w-3" /> Pause
        </button>
        <button onClick={cancelSession}
          className="flex items-center gap-1 px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/40 transition-all">
          <X className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}