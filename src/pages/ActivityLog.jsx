import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { asArray, resolveArray } from '@/lib/uiDataGuards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ClipboardList, Search, RefreshCw, Loader2,
  Activity, Globe, Hammer, BarChart3, FileSearch, Filter
} from 'lucide-react';

const TYPE_CONFIG = {
  pipeline: { icon: Activity,    color: 'text-primary',    bg: 'bg-primary/10'    },
  qa_audit: { icon: BarChart3,   color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  research: { icon: FileSearch,  color: 'text-purple-400', bg: 'bg-purple-500/10' },
  design:   { icon: Hammer,      color: 'text-orange-400', bg: 'bg-orange-500/10' },
  build:    { icon: Hammer,      color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
  deploy:   { icon: Globe,       color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
};

const STATUS_STYLE = {
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  failed:  'text-red-400 bg-red-500/10 border-red-500/20',
  running: 'text-primary bg-primary/10 border-primary/20',
  queued:  'text-muted-foreground bg-secondary/30 border-border',
};

function ActivityRow({ run, i }) {
  const cfg = TYPE_CONFIG[run.type] || TYPE_CONFIG.pipeline;
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.025 }}
      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-secondary/10 hover:bg-secondary/20 transition-colors"
    >
      <div className={`h-8 w-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-4 w-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-foreground capitalize">{run.type?.replace('_', ' ')} run</p>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLE[run.status] || STATUS_STYLE.queued}`}>
            {run.status}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{run.input?.slice(0, 80) || 'No input'}</p>
        <p className="text-[10px] text-muted-foreground/60">{run.user_email}</p>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <p className="text-[10px] font-mono text-muted-foreground">{new Date(run.created_date).toLocaleDateString()}</p>
        <p className="text-[9px] text-muted-foreground/60">{new Date(run.created_date).toLocaleTimeString()}</p>
        {run.duration_ms && <p className="text-[9px] text-muted-foreground/60">{(run.duration_ms / 1000).toFixed(1)}s</p>}
      </div>
    </motion.div>
  );
}

const TYPE_FILTERS = ['all', 'pipeline', 'qa_audit', 'research', 'design', 'build', 'deploy'];
const STATUS_FILTERS = ['all', 'success', 'failed', 'running', 'queued'];

export default function ActivityLog() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { fetchRuns(); }, []);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.Run.subscribe((event) => {
      if (event.type === 'create' && event.data) setRuns(prev => [event.data, ...asArray(prev)]);
      else if (event.type === 'update' && event.data) setRuns(prev => asArray(prev).map(r => r.id === event.id ? event.data : r));
    });
    return unsub;
  }, []);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const data = await resolveArray(base44.entities.Run.list('-created_date', 100));
      setRuns(data);
    } catch {} finally { setLoading(false); }
  };

  const safeRuns = asArray(runs);

  const filtered = safeRuns.filter(r => {
    const matchType   = typeFilter === 'all' || r.type === typeFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSearch = !search || r.input?.toLowerCase().includes(search.toLowerCase()) || r.user_email?.toLowerCase().includes(search.toLowerCase()) || r.type?.includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  // Stats
  const stats = {
    total:   safeRuns.length,
    success: safeRuns.filter(r => r.status === 'success').length,
    failed:  safeRuns.filter(r => r.status === 'failed').length,
    running: safeRuns.filter(r => r.status === 'running').length,
  };

  return (
    <div className="p-8 lg:p-10 max-w-4xl space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-primary" />
            User Activity Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Full audit trail of all pipeline and system activity</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchRuns} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', val: stats.total, color: 'text-foreground' },
          { label: 'Success', val: stats.success, color: 'text-emerald-400' },
          { label: 'Failed',  val: stats.failed,  color: 'text-red-400' },
          { label: 'Active',  val: stats.running, color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by input, email, type..." className="h-9 pl-8 text-sm" />
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {TYPE_FILTERS.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`text-[10px] font-semibold px-2 py-1 rounded border transition-all capitalize ${typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-[10px] font-semibold px-2 py-1 rounded border transition-all capitalize ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity list */}
      <div className="space-y-2">
        {loading && runs.length === 0 && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading activity...
          </div>
        )}
        <AnimatePresence>
          {filtered.map((run, i) => <ActivityRow key={run.id} run={run} i={i} />)}
        </AnimatePresence>
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <ClipboardList className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No activity found</p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Showing {filtered.length} of {safeRuns.length} events · Updates in real-time
      </p>
    </div>
  );
}
