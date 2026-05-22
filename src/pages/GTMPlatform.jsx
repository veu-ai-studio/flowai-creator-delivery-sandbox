import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import AuthPanel from '@/components/gtm/AuthPanel';
import DataPanel from '@/components/gtm/DataPanel';
import MemoryPanel from '@/components/gtm/MemoryPanel';
import APIGatewayPanel from '@/components/gtm/APIGatewayPanel';
import JobQueuePanel from '@/components/gtm/JobQueuePanel';
import MonitoringPanel from '@/components/gtm/MonitoringPanel';
import BillingPanel from '@/components/gtm/BillingPanel';
import {
  ShieldCheck, Database, Brain, Globe, Layers,
  BarChart2, CreditCard, CheckCircle2, XCircle, Loader2
} from 'lucide-react';

const LAYERS = [
  { id: 'auth',     label: 'AUTH',       icon: ShieldCheck,  color: 'text-red-400',    badge: 'PHASE A' },
  { id: 'data',     label: 'DATA',       icon: Database,     color: 'text-blue-400',   badge: 'PHASE B' },
  { id: 'memory',   label: 'MEMORY',     icon: Brain,        color: 'text-purple-400', badge: 'PHASE C' },
  { id: 'gateway',  label: 'API GATEWAY',icon: Globe,        color: 'text-orange-400', badge: 'PHASE D' },
  { id: 'jobs',     label: 'JOB QUEUE',  icon: Layers,       color: 'text-cyan-400',   badge: 'PHASE E' },
  { id: 'monitor',  label: 'MONITORING', icon: BarChart2,    color: 'text-emerald-400',badge: 'PHASE F' },
  { id: 'billing',  label: 'BILLING',    icon: CreditCard,   color: 'text-amber-400',  badge: 'PHASE G' },
];

function LayerStatus({ status }) {
  if (status === 'active') return <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold"><CheckCircle2 className="h-3 w-3" />ACTIVE</span>;
  if (status === 'failed') return <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold"><XCircle className="h-3 w-3" />FAILED</span>;
  if (status === 'running') return <span className="flex items-center gap-1 text-primary text-[10px] font-bold animate-pulse"><Loader2 className="h-3 w-3 animate-spin" />VALIDATING</span>;
  return <span className="text-muted-foreground text-[10px]">PENDING</span>;
}

export default function GTMPlatform() {
  const [activeLayer, setActiveLayer] = useState('auth');
  const [layerStatuses, setLayerStatuses] = useState({});
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  const setStatus = (id, status) => setLayerStatuses(prev => ({ ...prev, [id]: status }));

  const activeCount = Object.values(layerStatuses).filter(s => s === 'active').length;

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">GTM Platform</h1>
        <p className="text-sm text-muted-foreground mt-1">7-layer SaaS foundation — Auth · Data · Memory · API · Jobs · Monitoring · Billing</p>

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${(activeCount / 7) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono">{activeCount}/7 ACTIVE</span>
        </div>
      </motion.div>

      {/* Layer Tabs */}
      <div className="flex flex-wrap gap-2">
        {LAYERS.map(({ id, label, icon: Icon, color, badge }) => {
          const status = layerStatuses[id];
          return (
            <button
              key={id}
              onClick={() => setActiveLayer(id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                activeLayer === id
                  ? 'border-primary/60 bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              <span>{label}</span>
              {status === 'active' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
              {status === 'failed' && <XCircle className="h-3 w-3 text-red-400" />}
              {status === 'running' && <Loader2 className="h-3 w-3 text-primary animate-spin" />}
            </button>
          );
        })}
      </div>

      {/* Active Layer Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeLayer}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeLayer === 'auth'    && <AuthPanel    user={user} setUser={setUser} onStatus={s => setStatus('auth', s)} status={layerStatuses['auth']} />}
          {activeLayer === 'data'    && <DataPanel    user={user} onStatus={s => setStatus('data', s)} status={layerStatuses['data']} />}
          {activeLayer === 'memory'  && <MemoryPanel  user={user} onStatus={s => setStatus('memory', s)} status={layerStatuses['memory']} />}
          {activeLayer === 'gateway' && <APIGatewayPanel user={user} onStatus={s => setStatus('gateway', s)} status={layerStatuses['gateway']} />}
          {activeLayer === 'jobs'    && <JobQueuePanel   user={user} onStatus={s => setStatus('jobs', s)} status={layerStatuses['jobs']} />}
          {activeLayer === 'monitor' && <MonitoringPanel user={user} onStatus={s => setStatus('monitor', s)} status={layerStatuses['monitor']} />}
          {activeLayer === 'billing' && <BillingPanel    user={user} onStatus={s => setStatus('billing', s)} status={layerStatuses['billing']} />}
        </motion.div>
      </AnimatePresence>

      {/* System Status Footer */}
      {activeCount === 7 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-center space-y-2"
        >
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
          <p className="text-lg font-bold text-emerald-400">ALL 7 LAYERS ACTIVE — SYSTEM READY</p>
          <p className="text-xs text-muted-foreground">Auth · Data · Memory · API Gateway · Job Queue · Monitoring · Billing</p>
        </motion.div>
      )}
    </div>
  );
}