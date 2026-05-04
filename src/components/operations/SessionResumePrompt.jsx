// Resume prompt shown when an in-progress session exists
import { motion } from 'framer-motion';
import { Play, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export default function SessionResumePrompt({ session, lastStepName, onResume, onStartNew }) {
  const lastActive = session?.last_active_at || session?.started_at;
  const completedSteps = Object.values(session?.step_statuses || {}).filter(s => s === 'complete').length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-amber-400" />
        <p className="text-sm font-bold text-amber-400">Unfinished Session Found</p>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <p><span className="text-foreground font-semibold">Product:</span> {session?.product_name}</p>
        {lastStepName && <p><span className="text-foreground font-semibold">Last completed step:</span> {lastStepName}</p>}
        <p><span className="text-foreground font-semibold">Steps completed:</span> {completedSteps} of 8</p>
        {lastActive && <p><span className="text-foreground font-semibold">Last active:</span> {formatDistanceToNow(new Date(lastActive), { addSuffix: true })}</p>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={onResume} className="gap-2">
          <Play className="h-4 w-4" /> Resume Session
        </Button>
        <Button variant="outline" onClick={onStartNew} className="gap-2">
          <Plus className="h-4 w-4" /> Start New Session
        </Button>
      </div>
    </motion.div>
  );
}