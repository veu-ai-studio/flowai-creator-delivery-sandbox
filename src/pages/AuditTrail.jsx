import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { asArray, resolveArray } from '@/lib/uiDataGuards';
import { Shield, Loader2, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

const ACTION_COLORS = {
  session_started:           'text-blue-400',
  step_completed:            'text-emerald-400',
  proposal_approved:         'text-emerald-400',
  proposal_modified:         'text-amber-400',
  proposal_skipped:          'text-muted-foreground',
  findings_approved:         'text-emerald-400',
  findings_rerun:            'text-amber-400',
  fix_applied:               'text-primary',
  fix_skipped:               'text-muted-foreground',
  clearance_decision_issued: 'text-purple-400',
  clearance_accepted_and_locked: 'text-emerald-400',
};

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterMode, setFilterMode] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await resolveArray(base44.entities.GovernanceAuditLog.list('-created_date', 200));
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const safeLogs = asArray(logs);

  const filtered = safeLogs.filter(l => {
    if (filterProduct && !l.product_url?.toLowerCase().includes(filterProduct.toLowerCase()) && !l.action_detail?.toLowerCase().includes(filterProduct.toLowerCase())) return false;
    if (filterAction && l.action_type !== filterAction) return false;
    if (filterMode && l.mode !== filterMode) return false;
    return true;
  });

  const ACTION_TYPES = [...new Set(safeLogs.map(l => l.action_type).filter(Boolean))];
  const MODES = [...new Set(safeLogs.map(l => l.mode).filter(Boolean))];

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" /> Governance Audit Trail
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tamper-evident log of every action taken in FlowAI — read only
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-3 items-center">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Input
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
          placeholder="Filter by product URL…"
          className="h-8 text-xs w-48"
        />
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none"
        >
          <option value="">All action types</option>
          {ACTION_TYPES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <select
          value={filterMode}
          onChange={e => setFilterMode(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none"
        >
          <option value="">All modes</option>
          {MODES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {(filterProduct || filterAction || filterMode) && (
          <button onClick={() => { setFilterProduct(''); setFilterAction(''); setFilterMode(''); }}
            className="text-[11px] text-muted-foreground hover:text-foreground underline">
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">{filtered.length} entries</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No audit log entries yet.</p>
          <p className="text-[11px] text-muted-foreground/50 mt-1">Actions in Auto, Guided, and Manual modes will appear here.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((log, i) => (
            <motion.div key={log.id || i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.01 }}
              className="rounded-lg border border-border bg-card px-4 py-3 flex items-start gap-4 flex-wrap">
              <div className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 w-32">
                {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : '—'}
              </div>
              <div className="text-[11px] font-semibold text-foreground w-32 shrink-0 truncate">
                {log.user || '—'}
              </div>
              <div className={`text-[11px] font-bold uppercase tracking-wide w-44 shrink-0 ${ACTION_COLORS[log.action_type] || 'text-foreground'}`}>
                {(log.action_type || '').replace(/_/g, ' ')}
              </div>
              <div className="flex-1 min-w-0">
                {log.step_name && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded mr-2">{log.step_name}</span>}
                {log.mode && <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded mr-2">{log.mode}</span>}
                <span className="text-[11px] text-muted-foreground">{log.action_detail || ''}</span>
              </div>
              {log.outcome && (
                <div className="text-[10px] font-semibold text-muted-foreground shrink-0">{log.outcome}</div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
