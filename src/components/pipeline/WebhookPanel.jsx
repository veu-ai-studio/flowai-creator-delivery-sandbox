import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Webhook, Copy, Check, RefreshCw, Shield, Github, Globe, Zap } from 'lucide-react';

const WEBHOOK_SECRET = 'flowai-webhook-secret';

const PROVIDERS = [
  { key: 'github',  label: 'GitHub',  icon: Github,  events: ['push', 'pull_request', 'deployment_status'], color: 'text-foreground' },
  { key: 'vercel',  label: 'Vercel',  icon: Globe,   events: ['deployment.succeeded', 'deployment.failed'],   color: 'text-sky-400' },
  { key: 'custom',  label: 'Custom',  icon: Zap,     events: ['trigger_pipeline', 'run_qa'],                  color: 'text-amber-400' },
];

function CopyBox({ value, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex gap-2">
        <code className="flex-1 text-xs font-mono bg-secondary/50 border border-border rounded px-3 py-2 text-foreground break-all">{value}</code>
        <button onClick={copy} className="shrink-0 p-2 rounded border border-border hover:bg-secondary transition-colors">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </div>
    </div>
  );
}

export default function WebhookPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testPayload, setTestPayload] = useState('{"event":"push","ref":"refs/heads/main"}');
  const [testResult, setTestResult] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('github');

  // We can't easily get the function URL, so construct it conceptually
  const webhookUrl = `[Your Base44 Function URL]/webhookHandler`;

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const logs = await base44.entities.ErrorLog.filter({ source: 'webhook:github' }, '-created_date', 20);
      const all = [
        ...logs,
        ...(await base44.entities.ErrorLog.filter({ source: 'webhook:vercel' }, '-created_date', 10)),
        ...(await base44.entities.ErrorLog.filter({ source: 'webhook:custom' }, '-created_date', 10)),
      ].sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      setEvents(all);
    } catch {} finally { setLoading(false); }
  };

  const simulateWebhook = async () => {
    setTestResult(null);
    try {
      const parsed = JSON.parse(testPayload);
      // Log a simulated event directly
      await base44.entities.ErrorLog.create({
        source: `webhook:${selectedProvider}`,
        message: `Simulated webhook: ${parsed.event || parsed.action || 'unknown'}`,
        context: { ...parsed, simulated: true, ts: new Date().toISOString() },
        severity: 'low',
      });
      setTestResult({ success: true, message: 'Webhook event logged successfully' });
      await loadEvents();
    } catch (e) {
      setTestResult({ success: false, message: e.message });
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          Live Webhooks
        </h2>
        <Button size="sm" variant="outline" onClick={loadEvents} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Endpoint info */}
      <div className="space-y-3 p-4 rounded-lg border border-border bg-secondary/20">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" />Webhook Endpoint Config</p>
        <CopyBox label="Endpoint URL" value={webhookUrl} />
        <CopyBox label="Secret Header — x-webhook-secret" value={WEBHOOK_SECRET} />
        <p className="text-[10px] text-muted-foreground">Find the real URL in Dashboard → Code → Functions → webhookHandler</p>
      </div>

      {/* Provider setup guides */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supported Providers</p>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map(({ key, label, icon: Icon, events: evts, color }) => (
            <div key={key} className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1.5">
              <p className={`text-xs font-bold flex items-center gap-1.5 ${color}`}><Icon className="h-3.5 w-3.5" />{label}</p>
              {evts.map(e => <p key={e} className="text-[10px] text-muted-foreground font-mono">• {e}</p>)}
            </div>
          ))}
        </div>
      </div>

      {/* Test webhook */}
      <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-secondary/10">
        <p className="text-xs font-semibold text-foreground">Simulate Webhook Event</p>
        <div className="flex gap-2">
          {PROVIDERS.map(({ key, label }) => (
            <button key={key} onClick={() => setSelectedProvider(key)}
              className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${selectedProvider === key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={testPayload}
          onChange={e => setTestPayload(e.target.value)}
          className="w-full h-20 text-xs font-mono bg-background border border-border rounded px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button size="sm" onClick={simulateWebhook} className="gap-1.5">
          <Zap className="h-3.5 w-3.5" /> Send Test Event
        </Button>
        {testResult && (
          <p className={`text-xs ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
            {testResult.success ? '✓' : '✗'} {testResult.message}
          </p>
        )}
      </div>

      {/* Event log */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Received Events ({events.length})</p>
        {events.length === 0 && <p className="text-xs text-muted-foreground py-2">No webhook events yet. Send a test event above or configure your provider.</p>}
        <AnimatePresence>
          {events.slice(0, 12).map((ev, i) => (
            <motion.div key={ev.id || i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-lg border border-border/50 bg-secondary/10 p-3 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-primary font-mono shrink-0">{ev.source?.split(':')[1] || 'webhook'}</span>
                <span className="text-foreground truncate">{ev.message}</span>
                {ev.context?.simulated && <span className="text-[9px] text-amber-400 shrink-0">simulated</span>}
              </div>
              <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                {new Date(ev.created_date).toLocaleTimeString()}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
