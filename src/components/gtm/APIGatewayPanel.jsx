import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Globe, CheckCircle2, XCircle, Loader2, Play } from 'lucide-react';

const ENDPOINTS = [
  { name: '/api/run',      fn: 'apiRun',     payload: { type: 'qa_audit', input: 'https://example.com' } },
  { name: '/api/research', fn: 'apiGateway', payload: { endpoint: 'research', input: 'SaaS productivity tool' } },
  { name: '/api/design',   fn: 'apiGateway', payload: { endpoint: 'design',   input: 'SaaS productivity tool' } },
  { name: '/api/build',    fn: 'apiGateway', payload: { endpoint: 'build',    input: 'SaaS productivity tool' } },
];

export default function APIGatewayPanel({ user, onStatus, status }) {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(null);
  const [allTested, setAllTested] = useState(false);

  const testEndpoint = async (ep) => {
    setLoading(ep.name);
    try {
      const res = await base44.functions.invoke(ep.fn, ep.payload);
      setResults(prev => ({ ...prev, [ep.name]: { pass: !res?.data?.error, detail: res?.data?.error || 'OK' } }));
    } catch (e) {
      setResults(prev => ({ ...prev, [ep.name]: { pass: false, detail: e.message } }));
    } finally {
      setLoading(null);
    }
  };

  const testAll = async () => {
    for (const ep of ENDPOINTS) await testEndpoint(ep);
    setAllTested(true);
    const allPass = ENDPOINTS.every(ep => results[ep.name]?.pass !== false);
    onStatus(allPass ? 'active' : 'failed');
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-5 w-5 text-orange-400" />
          Phase D — API Gateway
        </h2>
        {status === 'active' && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">API GATEWAY ACTIVE</span>}
      </div>

      <div className="space-y-2">
        {ENDPOINTS.map(ep => {
          const r = results[ep.name];
          return (
            <motion.div key={ep.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-lg border border-border bg-secondary/30 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                {r ? (r.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />) : <div className="h-3.5 w-3.5 rounded-full border border-border shrink-0" />}
                <code className="text-xs text-primary">{ep.name}</code>
                {r && <span className={`text-[10px] ml-2 ${r.pass ? 'text-emerald-400' : 'text-red-400'}`}>{r.detail}</span>}
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => testEndpoint(ep)} disabled={loading === ep.name || !user}>
                {loading === ep.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Test
              </Button>
            </motion.div>
          );
        })}
      </div>

      <Button size="sm" onClick={testAll} disabled={!!loading || !user} className="gap-1.5">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        Test All Endpoints
      </Button>

      <div className="text-[10px] font-mono text-muted-foreground space-y-0.5 pt-2 border-t border-border">
        <p>• Unified gateway routes internally — no direct UI→engine calls</p>
        <p>• All routes require auth</p>
        <p>• Results persisted as Run records</p>
      </div>
    </div>
  );
}