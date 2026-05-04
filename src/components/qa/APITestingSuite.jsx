import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Play, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const StatusBadge = ({ status }) => {
  if (!status) return null;
  const ok = status >= 200 && status < 300;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
      {status}
    </span>
  );
};

export default function APITestingSuite({ url }) {
  const [endpoints, setEndpoints] = useState([
    { id: 1, method: 'GET', path: '/', expectedStatus: 200, result: null, loading: false },
  ]);
  const [runningAll, setRunningAll] = useState(false);

  const update = (id, patch) =>
    setEndpoints((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const addEndpoint = () =>
    setEndpoints((prev) => [...prev, { id: Date.now(), method: 'GET', path: '/', expectedStatus: 200, result: null, loading: false }]);

  const removeEndpoint = (id) => setEndpoints((prev) => prev.filter((e) => e.id !== id));

  const runEndpoint = async (ep) => {
    update(ep.id, { loading: true, result: null });
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Simulate an HTTP ${ep.method} request to "${url}${ep.path}". Return a realistic mock response.`,
        response_json_schema: {
          type: 'object',
          properties: {
            status_code: { type: 'number' },
            latency_ms: { type: 'number' },
            body_preview: { type: 'string' },
            passed: { type: 'boolean' },
          },
        },
      });
      update(ep.id, { result: res, loading: false });
    } catch {
      update(ep.id, { result: { status_code: 500, latency_ms: 0, body_preview: 'Error', passed: false }, loading: false });
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    await Promise.all(endpoints.map(runEndpoint));
    setRunningAll(false);
  };

  const passed = endpoints.filter((e) => e.result?.passed).length;
  const total = endpoints.filter((e) => e.result).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          API Testing Suite
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={addEndpoint}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
          <Button size="sm" className="gap-1.5" onClick={runAll} disabled={runningAll}>
            {runningAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run All
          </Button>
        </div>
      </div>

      {total > 0 && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="text-emerald-400 font-semibold">{passed} passed</span>
          <span className="text-red-400 font-semibold">{total - passed} failed</span>
          <span>{total} tested</span>
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence>
          {endpoints.map((ep) => (
            <motion.div
              key={ep.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <select
                  value={ep.method}
                  onChange={(e) => update(ep.id, { method: e.target.value })}
                  className="h-8 rounded border border-input bg-transparent text-xs text-foreground px-1.5"
                >
                  {METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
                <Input
                  value={ep.path}
                  onChange={(e) => update(ep.id, { path: e.target.value })}
                  className="h-8 text-xs flex-1"
                  placeholder="/api/endpoint"
                />
                <Button size="icon" className="h-8 w-8" onClick={() => runEndpoint(ep)} disabled={ep.loading}>
                  {ep.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
                <button onClick={() => removeEndpoint(ep.id)} className="p-1.5 hover:text-destructive text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {ep.result && (
                <div className="flex items-center gap-3 text-xs pl-1">
                  {ep.result.passed
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                  <StatusBadge status={ep.result.status_code} />
                  <span className="text-muted-foreground">{ep.result.latency_ms}ms</span>
                  <span className="text-muted-foreground truncate">{ep.result.body_preview}</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}