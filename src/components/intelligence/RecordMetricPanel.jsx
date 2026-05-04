import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { PlusCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const TOOLS = [
  { id: 'chatgpt', name: 'ChatGPT', capability: 'reasoning' },
  { id: 'claude', name: 'Claude', capability: 'reasoning' },
  { id: 'vercel', name: 'Vercel', capability: 'deployment' },
  { id: 'netlify', name: 'Netlify', capability: 'deployment' },
  { id: 'railway', name: 'Railway', capability: 'deployment' },
  { id: 'replit', name: 'Replit', capability: 'execution' },
  { id: 'codesandbox', name: 'CodeSandbox', capability: 'execution' },
  { id: 'base44', name: 'Base44 Audit', capability: 'auditing' },
  { id: 'playwright', name: 'Playwright', capability: 'crawling' },
];

export default function RecordMetricPanel({ onRecorded }) {
  const [open, setOpen] = useState(false);
  const [toolId, setToolId] = useState('chatgpt');
  const [success, setSuccess] = useState(true);
  const [latency, setLatency] = useState('800');
  const [cost, setCost] = useState('0.003');
  const [taskType, setTaskType] = useState('code_generation');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedTool = TOOLS.find(t => t.id === toolId);

  const handleRecord = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('recordToolMetric', {
        tool_id: toolId,
        tool_name: selectedTool?.name || toolId,
        capability: selectedTool?.capability || 'reasoning',
        success,
        latency_ms: parseFloat(latency) || 0,
        cost_usd: parseFloat(cost) || 0,
        task_type: taskType,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (onRecorded) onRecorded();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-foreground hover:bg-secondary/20 transition-colors">
        <span className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4 text-primary" />
          Record Tool Usage Metric
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border space-y-4 pt-4">
          <p className="text-xs text-muted-foreground">Manually record a tool usage event to build up the intelligence database.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Tool</label>
              <select value={toolId} onChange={e => setToolId(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {TOOLS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Outcome</label>
              <select value={success ? 'success' : 'failure'} onChange={e => setSuccess(e.target.value === 'success')}
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Task Type</label>
              <input value={taskType} onChange={e => setTaskType(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Latency (ms)</label>
              <input type="number" value={latency} onChange={e => setLatency(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Cost USD</label>
              <input type="number" step="0.0001" value={cost} onChange={e => setCost(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <Button size="sm" className="gap-2" onClick={handleRecord} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <PlusCircle className="h-3.5 w-3.5" />}
            {saved ? 'Recorded!' : saving ? 'Saving...' : 'Record Metric'}
          </Button>
        </div>
      )}
    </div>
  );
}