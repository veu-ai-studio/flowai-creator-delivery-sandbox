import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, AlertTriangle, Bell, BellOff, RefreshCw, Loader2, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SEV = {
  critical: 'border-red-500/40 bg-red-500/5 text-red-400',
  high:     'border-orange-500/40 bg-orange-500/5 text-orange-400',
  medium:   'border-amber-500/40 bg-amber-500/5 text-amber-400',
  low:      'border-border bg-secondary/20 text-muted-foreground',
};

export default function AntiScrapingAlerts({ url: propUrl }) {
  const [url, setUrl] = useState(propUrl || '');
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [lastScan, setLastScan] = useState(null);

  const scan = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a security analyst detecting scraping and bot activity on a web platform.
Analyze the URL: ${url}
Simulate detecting scraping patterns and generate realistic anti-scraping alerts.
Return JSON with "alerts" array (5-8 items), each with: id, type (bot_spike|rate_limit|honeypot_triggered|suspicious_ua|credential_stuffing|data_exfil), title, description, severity (critical|high|medium|low), timestamp (ISO), source_ip (fake), requests_per_min (number), auto_blocked (boolean).`,
        response_json_schema: {
          type: 'object',
          properties: {
            alerts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  severity: { type: 'string' },
                  timestamp: { type: 'string' },
                  source_ip: { type: 'string' },
                  requests_per_min: { type: 'number' },
                  auto_blocked: { type: 'boolean' },
                },
              },
            },
          },
        },
      });
      setAlerts(res?.alerts || []);
      setLastScan(new Date().toISOString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  const blockedCount = alerts.filter(a => a.auto_blocked).length;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Bot className="h-4 w-4 text-red-400" /> Anti-Scraping Alerts
          {criticalCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">{criticalCount} high risk</span>
          )}
        </h3>
        <button onClick={() => setAlertsEnabled(v => !v)}
          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-all ${alertsEnabled ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
          {alertsEnabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
          {alertsEnabled ? 'Alerts ON' : 'Alerts OFF'}
        </button>
      </div>

      <div className="flex gap-2">
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourapp.com"
          className="h-8 text-xs flex-1" />
        <Button size="sm" onClick={scan} disabled={loading || !url.trim()} className="h-8 gap-1.5 text-xs shrink-0">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Scan
        </Button>
      </div>

      {lastScan && (
        <div className="flex gap-4 text-[10px] text-muted-foreground">
          <span>Last scan: {new Date(lastScan).toLocaleTimeString()}</span>
          <span className="text-emerald-400">{blockedCount} auto-blocked</span>
          <span>{alerts.length} total alerts</span>
        </div>
      )}

      <AnimatePresence>
        {alerts.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {alerts.map((alert, i) => (
              <motion.div key={alert.id || i}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className={`rounded-lg border p-3 flex gap-3 ${SEV[alert.severity] || SEV.low}`}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold truncate">{alert.title}</p>
                    {alert.auto_blocked && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0 flex items-center gap-0.5">
                        <Shield className="h-2.5 w-2.5" /> Blocked
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] opacity-80 mt-0.5">{alert.description}</p>
                  <div className="flex gap-3 mt-1 text-[9px] opacity-60">
                    {alert.source_ip && <span>IP: {alert.source_ip}</span>}
                    {alert.requests_per_min && <span>{alert.requests_per_min} req/min</span>}
                    {alert.timestamp && <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {!loading && alerts.length === 0 && lastScan && (
        <p className="text-xs text-muted-foreground text-center py-3">No threats detected in last scan</p>
      )}
      {!lastScan && !loading && (
        <p className="text-xs text-muted-foreground text-center py-3">Scan a URL to detect scraping activity</p>
      )}
    </div>
  );
}