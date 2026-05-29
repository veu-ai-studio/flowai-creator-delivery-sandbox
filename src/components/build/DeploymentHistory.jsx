import { motion } from 'framer-motion';
import { History } from 'lucide-react';

export default function DeploymentHistory() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        Deployment History
      </h3>
      
      <div className="text-center py-8 text-xs text-muted-foreground">
        <p>No deployments yet. Run Build to generate your first deployment.</p>
      </div>
    </motion.div>
  );
}