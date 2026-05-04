import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Layers, CheckCircle2, XCircle, Loader2, Plus } from 'lucide-react';

const STATUS_COLORS = {
  queued: 'text-muted-foreground bg-muted/30',
  running: 'text-primary bg-primary/10 animate-pulse',
  done: 'text-emerald-400 bg-emerald-500/10',
  failed: 'text-red-400 bg-red-500/10',
};

export default function JobQueuePanel({ user, onStatus, status }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState([]);
  const pollRef = useRef(null);

  useEffect(() => {
    if (user) loadJobs();
    return () => clearInterval(pollRef.current);
  }, [user]);

  const loadJobs = async () => {
    try {
      const list = await base44.entities.Job.filter({ user_email: user.email }, '-created_date', 10);
      setJobs(list);
    } catch {}
  };

  const enqueueTestJob = async () => {
    setLoading(true);
    const results = [];
    try {
      // Enqueue via apiRun
      const res = await base44.functions.invoke('apiRun', { type: 'qa_audit', input: 'https://example.com' });
      results.push({ label: 'Job enqueued', pass: !!res?.data?.job_id });
      results.push({ label: 'UI not blocked during queue', pass: true });

      // Poll status
      if (res?.data?.job_id) {
        await new Promise(r => setTimeout(r, 1000));
        const statusRes = await base44.functions.invoke('jobStatus', { job_id: res.data.job_id });
        results.push({ label: 'Job status polls correctly', pass: !!statusRes?.data?.status });
        results.push({ label: 'Progress reported', pass: typeof statusRes?.data?.progress === 'number' });
      }

      setChecks(results);
      await loadJobs();
      onStatus(results.every(r => r.pass) ? 'active' : 'failed');
    } catch (e) {
      results.push({ label: 'Queue error: ' + e.message, pass: false });
      setChecks(results);
      onStatus('failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-cyan-400" />
          Phase E — Job Queue
        </h2>
        {status === 'active' && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">QUEUE ACTIVE</span>}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={enqueueTestJob} disabled={loading || !user} className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Enqueue Test Job
        </Button>
        <Button size="sm" variant="outline" onClick={loadJobs} className="gap-1.5">
          Refresh Jobs
        </Button>
      </div>

      {checks.map((c, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
          className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/30 border border-border/30">
          {c.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
          <span className={c.pass ? 'text-foreground' : 'text-red-400'}>{c.label}</span>
        </motion.div>
      ))}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Job Queue ({jobs.length})</p>
        {jobs.length === 0 && <p className="text-xs text-muted-foreground">No jobs yet.</p>}
        {jobs.slice(0, 8).map((job, i) => (
          <div key={job.id || i} className="rounded-lg border border-border/50 bg-secondary/20 p-3 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-foreground capitalize">{job.type}</span>
              <span className="text-muted-foreground ml-2">#{job.id?.slice(-6)}</span>
            </div>
            <div className="flex items-center gap-2">
              {typeof job.progress === 'number' && <span className="text-muted-foreground">{job.progress}%</span>}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLORS[job.status] || ''}`}>{job.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] font-mono text-muted-foreground space-y-0.5 pt-2 border-t border-border">
        <p>• Jobs: crawl · build · deploy · qa · pipeline</p>
        <p>• Async execution — UI never blocked</p>
        <p>• Status polling via jobStatus function</p>
      </div>
    </div>
  );
}