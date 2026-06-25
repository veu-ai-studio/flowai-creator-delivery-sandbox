import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, ExternalLink, Loader2, Play, RotateCcw, XCircle } from 'lucide-react';

function parseSseBlock(block) {
  const lines = String(block || '').split(/\r?\n/);
  let event = 'message';
  const dataLines = [];
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim() || event;
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return { event, data: { raw: dataLines.join('\n') } };
  }
}

function attemptTone(state) {
  if (state === 'succeeded') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  if (state === 'timeout') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  if (state === 'failed' || state === 'final_failed') return 'border-red-500/40 bg-red-500/10 text-red-200';
  if (state === 'selected') return 'border-primary/40 bg-primary/10 text-primary';
  return 'border-border bg-muted/20 text-muted-foreground';
}

function statusCopy(status) {
  if (status === 'running') return 'Running';
  if (status === 'success') return 'Complete';
  if (status === 'error') return 'Blocked';
  return 'Ready';
}

export default function BuildFailoverProofPanel() {
  const [status, setStatus] = useState('idle');
  const [events, setEvents] = useState([]);
  const [final, setFinal] = useState(null);
  const [error, setError] = useState('');
  const [operatorSecret, setOperatorSecret] = useState('');

  const attempts = useMemo(
    () => events.filter(item => item.event === 'attempt').map(item => item.data),
    [events],
  );

  const runProof = async () => {
    setStatus('running');
    setEvents([]);
    setFinal(null);
    setError('');

    try {
      const response = await fetch('/api/forge/build-failover-proof', {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          ...(operatorSecret.trim() ? { 'x-flowai-operator-secret': operatorSecret.trim() } : {}),
        },
        credentials: 'include',
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Build failover proof returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\n\n/);
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          const parsed = parseSseBlock(block);
          if (!parsed) continue;
          setEvents(prev => [...prev, parsed]);
          if (parsed.event === 'final') {
            setFinal(parsed.data);
            setStatus('success');
          }
          if (parsed.event === 'error') {
            setError(parsed.data?.message || 'Build failover proof failed.');
            setStatus('error');
          }
        }
      }
    } catch (err) {
      setError(err?.message || 'Build failover proof failed.');
      setStatus('error');
    }
  };

  return (
    <section className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Build Failover Proof</p>
          <h2 className="mt-1 text-lg font-bold text-foreground">Watch Codex fail over to Claude Code</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            status === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : status === 'error'
                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                : status === 'running'
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-muted/20 text-muted-foreground'
          }`}>
            {statusCopy(status)}
          </span>
          <Button type="button" onClick={runProof} disabled={status === 'running'} className="gap-2">
            {status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : status === 'success' ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {status === 'success' ? 'Run Again' : 'Run Proof'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="password"
          value={operatorSecret}
          onChange={(event) => setOperatorSecret(event.target.value)}
          placeholder="Operator secret if your session is not operator-authenticated"
          autoComplete="off"
          className="h-9 text-xs"
        />
      </div>

      <div className="grid gap-2">
        {attempts.length === 0 && (
          <div className="rounded-lg border border-border bg-background/50 p-3 text-sm text-muted-foreground">
            Press Run Proof to stream the live selected-tool attempts.
          </div>
        )}
        {attempts.map((item, index) => {
          const attempt = item.attempt || {};
          const state = attempt.state || 'attempt';
          return (
            <div key={`${state}-${attempt.tool || attempt.memberId}-${index}`} className={`rounded-lg border p-3 ${attemptTone(state)}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {state === 'succeeded' ? <CheckCircle2 className="h-4 w-4" /> : state === 'timeout' || state === 'failed' ? <XCircle className="h-4 w-4" /> : <Loader2 className={`h-4 w-4 ${state === 'selected' ? 'animate-spin' : ''}`} />}
                  <span className="text-sm font-bold">{item.message}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-75">rank {attempt.rank ?? index + 1}</span>
              </div>
              {attempt.reason && <p className="mt-1 text-xs opacity-80">{attempt.reason}</p>}
            </div>
          );
        })}
      </div>

      {final?.deployedUrl && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
          <p className="text-sm font-bold text-emerald-100">Claude Code recovered and deployed output.</p>
          <a href={final.deployedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100 underline underline-offset-4">
            Open deployed output <ExternalLink className="h-4 w-4" />
          </a>
          <p className="text-xs text-emerald-100/80 break-all">proofRunId: {final.proofRunId}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}
    </section>
  );
}
