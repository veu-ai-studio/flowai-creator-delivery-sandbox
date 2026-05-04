import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Brain, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

export default function MemoryPanel({ user, onStatus, status }) {
  const [validating, setValidating] = useState(false);
  const [runs, setRuns] = useState([]);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) loadHistory(); }, [user]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('userMemory', { action: 'load', limit: 10 });
      setRuns(res?.data?.runs || []);
    } catch {} finally { setLoading(false); }
  };

  const runValidation = async () => {
    setValidating(true);
    onStatus('running');
    const results = [];

    try {
      // Save a test run
      const saveRes = await base44.functions.invoke('userMemory', {
        action: 'save',
        run_data: {
          type: 'qa_audit',
          input: '__memory_test__',
          scores: { overall: 8, ui_ux: 7, api: 8, logic: 9, business_value: 8 },
          output: { test: true },
          duration_ms: 100,
        },
      });
      results.push({ label: 'Save run to memory', pass: !!saveRes?.data?.saved_id });

      // Load it back
      const loadRes = await base44.functions.invoke('userMemory', { action: 'load', limit: 20 });
      const loaded = loadRes?.data?.runs || [];
      const found = loaded.find(r => r.input === '__memory_test__');
      results.push({ label: 'Load run from memory', pass: !!found });
      results.push({ label: 'Scores persisted', pass: !!found?.scores?.overall });
      results.push({ label: 'Tied to user_id', pass: !!found?.user_email });

      setRuns(loaded.filter(r => r.input !== '__memory_test__'));
      setChecks(results);
      onStatus(results.every(r => r.pass) ? 'active' : 'failed');
    } catch (e) {
      results.push({ label: 'Memory error: ' + e.message, pass: false });
      setChecks(results);
      onStatus('failed');
    } finally { setValidating(false); }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-400" />
          Phase C — Memory Layer
        </h2>
        {status === 'active' && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">MEMORY ACTIVE</span>}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={runValidation} disabled={validating || !user} className="gap-1.5">
          {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
          Validate Memory
        </Button>
        <Button size="sm" variant="outline" onClick={loadHistory} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload History
        </Button>
      </div>

      {checks.map((c, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
          className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/30 border border-border/30">
          {c.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
          <span className={c.pass ? 'text-foreground' : 'text-red-400'}>{c.label}</span>
        </motion.div>
      ))}

      {/* Run History */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Persisted Run History ({runs.length})</p>
        {runs.length === 0 && <p className="text-xs text-muted-foreground py-2">No runs stored yet.</p>}
        {runs.slice(0, 8).map((run, i) => (
          <div key={run.id || i} className="rounded-lg border border-border/50 bg-secondary/20 p-3 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-foreground capitalize">{run.type}</span>
              <span className="text-muted-foreground ml-2">{run.input?.slice(0, 40)}</span>
            </div>
            <div className="flex items-center gap-2">
              {run.scores?.overall && <span className="text-primary font-bold">{run.scores.overall}/10</span>}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${run.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>{run.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] font-mono text-muted-foreground space-y-0.5 pt-2 border-t border-border">
        <p>• QA runs · scores · recommendations persisted per user</p>
        <p>• Survives page refresh — loads automatically on mount</p>
        <p>• Tied to user_email + project_id</p>
      </div>
    </div>
  );
}