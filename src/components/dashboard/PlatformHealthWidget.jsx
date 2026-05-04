// ─── PLATFORM HEALTH WIDGET — Phase 2A ───────────────────────────────────────
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Loader2, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PROXY = 'https://attached-assets-victor2081new.replit.app';

function HealthDot({ status }) {
  if (status === 'green') return <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block animate-pulse" />;
  if (status === 'yellow') return <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />;
}

export default function PlatformHealthWidget() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proxyStatus, setProxyStatus] = useState('checking'); // connected | degraded | offline
  const [lastSelfTest, setLastSelfTest] = useState(null);
  const [threatCount, setThreatCount] = useState(0);

  const checkProxy = async () => {
    try {
      const res = await fetch(`${PROXY}/health`, { signal: AbortSignal.timeout(5000) });
      return res.ok ? 'connected' : 'degraded';
    } catch {
      return 'offline';
    }
  };

  const loadData = async () => {
    setLoading(true);
    const [proxy, auditLogs] = await Promise.all([
      checkProxy(),
      base44.entities.GovernanceAuditLog.filter({}, '-timestamp', 50).catch(() => []),
    ]);

    setProxyStatus(proxy);

    // Count bot detections in last 24h
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const threats = auditLogs.filter(l =>
      l.action_detail?.includes('bot_detected') &&
      new Date(l.timestamp || l.created_date).getTime() > cutoff
    );
    setThreatCount(threats.length);

    // Find last self-test
    const selfTests = auditLogs.filter(l => l.action_detail?.includes('scheduled_self_test'));
    if (selfTests.length > 0) setLastSelfTest(selfTests[0]);

    // Determine overall health
    let status = 'green';
    if (proxy === 'offline') status = 'red';
    else if (proxy === 'degraded' || threats.length > 0) status = 'yellow';
    setHealth(status);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const proxyIcon = proxyStatus === 'connected'
    ? <Wifi className="h-3 w-3 text-emerald-400" />
    : proxyStatus === 'degraded'
    ? <Wifi className="h-3 w-3 text-amber-400" />
    : <WifiOff className="h-3 w-3 text-red-400" />;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Platform Health</p>
        </div>
        <button onClick={loadData} className="text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking platform health…
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Overall status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Overall Status</span>
            <div className="flex items-center gap-1.5">
              <HealthDot status={health} />
              <span className={`text-xs font-bold ${health === 'green' ? 'text-emerald-400' : health === 'yellow' ? 'text-amber-400' : 'text-red-400'}`}>
                {health === 'green' ? 'Healthy' : health === 'yellow' ? 'Warning' : 'Issues Detected'}
              </span>
            </div>
          </div>

          {/* Last self-test */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Last Self-Test</span>
            <span className="text-xs text-foreground font-semibold">
              {lastSelfTest
                ? formatDistanceToNow(new Date(lastSelfTest.timestamp || lastSelfTest.created_date), { addSuffix: true })
                : 'Never run'}
            </span>
          </div>

          {/* Active threats (24h) */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Threats (24h)</span>
            <span className={`text-xs font-bold ${threatCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {threatCount > 0 ? `⚠ ${threatCount} detected` : '✓ None'}
            </span>
          </div>

          {/* Proxy status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Fetch Proxy</span>
            <div className="flex items-center gap-1.5">
              {proxyIcon}
              <span className={`text-xs font-semibold capitalize ${
                proxyStatus === 'connected' ? 'text-emerald-400' :
                proxyStatus === 'degraded' ? 'text-amber-400' : 'text-red-400'
              }`}>{proxyStatus}</span>
            </div>
          </div>
        </div>
      )}

      {health === 'red' && !loading && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2.5 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <p className="text-[10px] text-red-400">Platform issues detected. Check audit trail.</p>
        </div>
      )}
    </div>
  );
}