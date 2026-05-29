import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, MessageSquare, Upload, Wand2, CheckCircle2, AlertCircle, Loader2, ExternalLink, Layers, Plus, X } from 'lucide-react';

// FlowAI Renewal Workspace — Orchestra-powered four-mode pipeline.
//
// User picks one of four input methods:
//   A. URL                 — FlowAI crawls + optional source acquisition → real Vercel preview
//   B. Describe Product    — Generate-from-scratch via Claude Code → real Vercel preview
//   C. Paste / Upload      — Same generate-from-scratch path
//   D. Synthesize 2–5 URLs — Cross-URL feature ranking → synthesized product
//
// All four feed `/api/renew`.  The response carries `renewedUrl` pointing
// at a real Vercel preview deployment (or `ok:false` + `buildLog` on
// failure).  No static-HTML inline iframes.

const STEPS = [
  'Adapting input',
  'Acquiring source',
  'Detecting issues',
  'Patching / generating renewed product',
  'Deploying preview to Vercel',
  'Building before/after report',
];

function ProgressPanel({ currentStep, error, sourceMode }) {
  if (currentStep == null) return null;
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold text-primary uppercase tracking-wide">Renewal in progress</p>
      </div>
      {sourceMode && (
        <p className="text-[11px] text-muted-foreground">
          {sourceMode === 'patch'
            ? 'Source acquisition succeeded — patching existing source.'
            : sourceMode === 'generate'
            ? 'Source unreachable or unsupplied — generating from scratch.'
            : sourceMode === 'synthesis'
            ? 'Multi-URL synthesis — combining strongest features from all sources.'
            : null}
        </p>
      )}
      <div className="space-y-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {i < currentStep && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
            {i === currentStep && !error && <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin shrink-0" />}
            {i === currentStep && error && <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
            {i > currentStep && <span className="inline-block h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />}
            <span className={i < currentStep ? 'text-foreground' : i === currentStep ? 'text-foreground font-semibold' : 'text-muted-foreground'}>
              {label}
            </span>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-400 mt-2 whitespace-pre-wrap">{error}</p>}
    </div>
  );
}

function BeforeAfterView({ report, onReset }) {
  if (!report) return null;
  const { sideBySidePresentation: sbs, deltaScore, issuesBefore, issuesAfter, issuesResolved, issuesRemaining, renewedUrl, renewalType, remediationPath, patchesApplied, sourceDisclosure, patchedFiles, generatedFiles, sourceContributions } = report;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Before / After</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Renewal type: <span className="font-mono">{renewalType}</span> · Path: <span className="font-mono">{remediationPath}</span> · {patchesApplied?.length || 0} patches
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onReset}>Run another</Button>
      </div>

      {sourceDisclosure && (
        <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-3 text-xs text-foreground whitespace-pre-wrap">
          <strong className="block text-blue-400 mb-1">SOURCE DISCLOSURE</strong>
          {sourceDisclosure}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-bold">Original</p>
          <OriginalPanel panel={sbs.original} />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-bold">Renewed — Vercel preview</p>
          <div className="rounded-lg border border-emerald-500/40 bg-card overflow-hidden">
            <iframe
              src={renewedUrl}
              title="Renewed preview"
              className="w-full h-[480px] border-0"
              sandbox="allow-same-origin allow-scripts"
              referrerPolicy="no-referrer"
            />
            <div className="p-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
              <span className="font-mono truncate">{renewedUrl}</span>
              <a href={renewedUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Score</p>
          <p className="text-2xl font-bold mt-1">{deltaScore.before} → <span className="text-emerald-400">{deltaScore.after}</span></p>
          <p className="text-xs text-muted-foreground">/50</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Issues</p>
          <p className="text-2xl font-bold mt-1">{issuesBefore} → <span className="text-emerald-400">{issuesAfter}</span></p>
          <p className="text-xs text-muted-foreground">{issuesResolved.length} resolved · {issuesRemaining.length} remaining</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Files</p>
          <p className="text-2xl font-bold mt-1">{(patchedFiles?.length || 0) + (generatedFiles?.length || 0)}</p>
          <p className="text-xs text-muted-foreground">
            {patchedFiles?.length ? `${patchedFiles.length} patched` : ''}
            {generatedFiles?.length ? `${generatedFiles.length} generated` : ''}
          </p>
        </div>
      </div>

      {sourceContributions && sourceContributions.length > 0 && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wide mb-2">Synthesis: contributions per source</p>
          <ul className="space-y-1 text-xs">
            {sourceContributions.map((c, idx) => (
              <li key={idx}>
                <span className="font-mono text-[10px] text-muted-foreground">{c.url}</span>
                {c.contributedFeatures.length > 0
                  ? <span> contributed: {c.contributedFeatures.join(', ')}</span>
                  : <span className="text-muted-foreground"> — no winning dimensions</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {issuesResolved.length > 0 && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide mb-2">Issues resolved by renewal</p>
          <ul className="space-y-1 text-xs">
            {issuesResolved.map((i) => (
              <li key={i.id} className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" /><span><span className="font-mono text-[10px] text-muted-foreground">{i.id}</span> · <span className="font-semibold">{i.category}</span> <span className="text-muted-foreground">({i.severity})</span></span></li>
            ))}
          </ul>
        </div>
      )}
      {issuesRemaining.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wide mb-2">Issues remaining</p>
          <ul className="space-y-1 text-xs">
            {issuesRemaining.map((i) => (
              <li key={i.id} className="flex gap-2"><AlertCircle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" /><span><span className="font-mono text-[10px] text-muted-foreground">{i.id}</span> · <span className="font-semibold">{i.category}</span> <span className="text-muted-foreground">({i.severity})</span></span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BuildFailedView({ result, onReset }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-bold text-red-400">Renewal failed</h2>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{result.reason || 'Build did not reach READY'}</p>
        {result.sourceDisclosure && (
          <p className="text-xs text-muted-foreground mt-3">{result.sourceDisclosure}</p>
        )}
      </div>
      {result.buildLog && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Build log (last 50 events)</p>
          <pre className="text-[11px] whitespace-pre-wrap overflow-x-auto bg-background p-3 rounded font-mono">{result.buildLog}</pre>
        </div>
      )}
      <Button size="sm" variant="outline" onClick={onReset}>Run another</Button>
    </div>
  );
}

function OriginalPanel({ panel }) {
  if (!panel) return null;
  if (panel.type === 'iframe' && panel.content) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <iframe src={panel.content} title="Original page" className="w-full h-[480px] border-0" sandbox="allow-same-origin" referrerPolicy="no-referrer" />
        <div className="p-2 border-t border-border text-[11px] text-muted-foreground font-mono truncate">{panel.content}</div>
      </div>
    );
  }
  if (panel.type === 'description-card') {
    const d = panel.content || {};
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-2 h-[480px] overflow-y-auto">
        {d.productName && <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Product</p><p className="text-sm font-bold">{d.productName}</p></div>}
        {d.whatItDoes && <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">What it does</p><p className="text-xs whitespace-pre-wrap">{d.whatItDoes}</p></div>}
        {d.targetAudience && <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Target audience</p><p className="text-xs">{d.targetAudience}</p></div>}
        {d.keyFeatures && <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Key features</p><p className="text-xs whitespace-pre-wrap">{d.keyFeatures}</p></div>}
        {d.currentIssues && <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current issues</p><p className="text-xs whitespace-pre-wrap">{d.currentIssues}</p></div>}
        {d.liveUrl && <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Live URL</p><p className="text-xs font-mono truncate">{d.liveUrl}</p></div>}
      </div>
    );
  }
  if (panel.type === 'screenshot' || panel.type === 'text') {
    const c = panel.content || {};
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3 h-[480px] overflow-y-auto">
        {c.text && (<div><p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pasted text</p><pre className="text-xs whitespace-pre-wrap font-sans">{c.text}</pre></div>)}
        {(c.attachments || []).map((a, idx) => (
          <div key={idx} className="border-t border-border pt-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{a.filename} · {a.mimeType}</p>
            {a.extractedText && <pre className="text-[11px] whitespace-pre-wrap mt-1 font-sans">{a.extractedText}</pre>}
          </div>
        ))}
      </div>
    );
  }
  if (panel.type === 'multi-url-grid') {
    const urls = panel.content?.urls || [];
    return (
      <div className="rounded-lg border border-border bg-card p-3 space-y-2 h-[480px] overflow-y-auto">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Source URLs ({urls.length})</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {urls.map((u, idx) => (
            <div key={idx} className="rounded border border-border p-2 text-[11px] font-mono break-all">{u}</div>
          ))}
        </div>
      </div>
    );
  }
  return <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">No preview available.</div>;
}

// ─── Input cards ──────────────────────────────────────────────────────

function UrlCard({ onRenew, disabled }) {
  const [url, setUrl] = useState('');
  const [showSource, setShowSource] = useState(false);
  const [gitUrl, setGitUrl] = useState('');
  const [vercelProject, setVercelProject] = useState('');
  const [base44Project, setBase44Project] = useState('');
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold uppercase tracking-wide">A. URL — Clone & Improve</p>
      </div>
      <p className="text-[11px] text-muted-foreground">FlowAI crawls the URL. Supply a Git URL / Vercel project to patch the real source — otherwise FlowAI generates a renewed product from spec.</p>
      <Input
        value={url} onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com" className="h-9 text-sm" disabled={disabled}
      />
      <details className="text-[11px]" open={showSource} onToggle={(e) => setShowSource(e.target.open)}>
        <summary className="text-muted-foreground cursor-pointer">Optional: source for patching (GitHub URL / Vercel project / Base44 ID)</summary>
        <div className="mt-2 space-y-2">
          <Input value={gitUrl} onChange={(e) => setGitUrl(e.target.value)} placeholder="github.com/owner/repo (public or token-accessible)" className="h-8 text-xs" disabled={disabled} />
          <Input value={vercelProject} onChange={(e) => setVercelProject(e.target.value)} placeholder="Vercel project ID (optional)" className="h-8 text-xs" disabled={disabled} />
          <Input value={base44Project} onChange={(e) => setBase44Project(e.target.value)} placeholder="Base44 project ID (stub — not yet wired)" className="h-8 text-xs" disabled={disabled} />
        </div>
      </details>
      <Button size="sm" className="w-full gap-2" disabled={disabled || !url.trim()}
        onClick={() => onRenew({
          inputType: 'url', url: url.trim(),
          sourceHints: (gitUrl || vercelProject || base44Project)
            ? { gitUrl: gitUrl.trim() || undefined, vercelProject: vercelProject.trim() || undefined, base44Project: base44Project.trim() || undefined }
            : undefined,
        })}>
        <Wand2 className="h-3.5 w-3.5" /> Analyze & Renew
      </Button>
    </div>
  );
}

function DescriptionCard({ onRenew, disabled }) {
  const [d, setD] = useState({ productName: '', whatItDoes: '', targetAudience: '', keyFeatures: '', currentIssues: '', liveUrl: '', loginEmail: '', loginPassword: '' });
  const upd = (k) => (e) => setD((prev) => ({ ...prev, [k]: e.target.value }));
  const canSubmit = d.productName.trim() || d.whatItDoes.trim() || d.targetAudience.trim() || d.keyFeatures.trim();
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-amber-400" />
        <p className="text-sm font-bold uppercase tracking-wide">B. Describe Your Product</p>
      </div>
      <p className="text-[11px] text-muted-foreground">Fill in what you know. FlowAI generates a working Vite-React landing page from your spec and deploys it.</p>
      <Input value={d.productName} onChange={upd('productName')} placeholder="Product name" className="h-8 text-xs" disabled={disabled} />
      <textarea value={d.whatItDoes} onChange={upd('whatItDoes')} placeholder="What it does (one paragraph)" rows={2} className="w-full text-xs p-2 rounded-md border border-input bg-background" disabled={disabled} />
      <Input value={d.targetAudience} onChange={upd('targetAudience')} placeholder="Target audience" className="h-8 text-xs" disabled={disabled} />
      <textarea value={d.keyFeatures} onChange={upd('keyFeatures')} placeholder="Key features (comma separated)" rows={2} className="w-full text-xs p-2 rounded-md border border-input bg-background" disabled={disabled} />
      <textarea value={d.currentIssues} onChange={upd('currentIssues')} placeholder="Current issues (optional)" rows={2} className="w-full text-xs p-2 rounded-md border border-input bg-background" disabled={disabled} />
      <details className="text-[11px]">
        <summary className="text-muted-foreground cursor-pointer">Optional: live URL + credentials (session-only)</summary>
        <div className="mt-2 space-y-2">
          <Input value={d.liveUrl} onChange={upd('liveUrl')} placeholder="https://live-url.com (optional)" className="h-8 text-xs" disabled={disabled} />
          <Input value={d.loginEmail} onChange={upd('loginEmail')} type="email" placeholder="Login email" className="h-8 text-xs" disabled={disabled} />
          <Input value={d.loginPassword} onChange={upd('loginPassword')} type="password" placeholder="Login password" className="h-8 text-xs" disabled={disabled} />
          <p className="text-[10px] text-muted-foreground">Credentials are session-only and never stored.</p>
        </div>
      </details>
      <Button size="sm" className="w-full gap-2" disabled={disabled || !canSubmit}
        onClick={() => onRenew({ inputType: 'description', description: d })}>
        <Wand2 className="h-3.5 w-3.5" /> Generate Renewed Version
      </Button>
    </div>
  );
}

function ContentCard({ onRenew, disabled }) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const onFile = async (e) => {
    const files = Array.from(e.target.files || []);
    const next = [];
    for (const f of files) {
      const buf = await f.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      next.push({ filename: f.name, mimeType: f.type, size: f.size, base64 });
    }
    setAttachments((prev) => [...prev, ...next]);
    e.target.value = '';
  };
  const canSubmit = text.trim() || attachments.length > 0;
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-emerald-400" />
        <p className="text-sm font-bold uppercase tracking-wide">C. Paste / Upload</p>
      </div>
      <p className="text-[11px] text-muted-foreground">Paste copy or upload PNG/JPG screenshots. FlowAI OCRs images and generates a renewed product.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your copy here…" rows={4} className="w-full text-xs p-2 rounded-md border border-input bg-background" disabled={disabled} />
      <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={onFile} className="text-xs" disabled={disabled} />
      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className="truncate flex-1">{a.filename}</span>
              <span className="text-muted-foreground">{Math.round(a.size / 1024)} KB</span>
              <button onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-400">×</button>
            </div>
          ))}
        </div>
      )}
      <Button size="sm" className="w-full gap-2" disabled={disabled || !canSubmit}
        onClick={() => onRenew({ inputType: 'content', content: { text: text.trim(), attachments } })}>
        <Wand2 className="h-3.5 w-3.5" /> Renew Content
      </Button>
    </div>
  );
}

function MultiUrlCard({ onRenew, disabled }) {
  const [urls, setUrls] = useState(['', '']);
  const updateAt = (idx, val) => setUrls((prev) => prev.map((u, i) => (i === idx ? val : u)));
  const addUrl = () => setUrls((prev) => (prev.length < 5 ? [...prev, ''] : prev));
  const removeAt = (idx) => setUrls((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev));
  const cleanUrls = urls.map((u) => u.trim()).filter(Boolean);
  const canSubmit = cleanUrls.length >= 2 && cleanUrls.length <= 5;
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-purple-400" />
        <p className="text-sm font-bold uppercase tracking-wide">D. Synthesize 2–5 URLs</p>
      </div>
      <p className="text-[11px] text-muted-foreground">FlowAI crawls all sources, ranks the strongest features per dimension across them, and generates a new synthesized product.</p>
      <div className="space-y-2">
        {urls.map((u, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input value={u} onChange={(e) => updateAt(idx, e.target.value)} placeholder={`URL ${idx + 1}`} className="h-8 text-xs flex-1" disabled={disabled} />
            {urls.length > 2 && <button onClick={() => removeAt(idx)} className="text-red-400 p-1"><X className="h-3 w-3" /></button>}
          </div>
        ))}
      </div>
      {urls.length < 5 && (
        <Button size="sm" variant="outline" className="gap-1 text-[11px] h-7" onClick={addUrl} disabled={disabled}>
          <Plus className="h-3 w-3" /> Add URL ({urls.length}/5)
        </Button>
      )}
      <Button size="sm" className="w-full gap-2" disabled={disabled || !canSubmit}
        onClick={() => onRenew({ inputType: 'multi-url', urls: cleanUrls })}>
        <Wand2 className="h-3.5 w-3.5" /> Synthesize & Build
      </Button>
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────

export default function Renewal() {
  const [currentStep, setCurrentStep] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [failResult, setFailResult] = useState(null);
  const [sourceMode, setSourceMode] = useState(null);

  const handleRenew = async (payload) => {
    setError(null);
    setReport(null);
    setFailResult(null);
    setSourceMode(payload.inputType === 'multi-url' ? 'synthesis' : (payload.sourceHints?.gitUrl || payload.sourceHints?.vercelProject ? 'patch' : 'generate'));
    setCurrentStep(0);
    try {
      // Visual-only progress dots; the server does the real work.
      const tickers = [
        setTimeout(() => setCurrentStep(1), 1200),
        setTimeout(() => setCurrentStep(2), 3000),
        setTimeout(() => setCurrentStep(3), 6000),
        setTimeout(() => setCurrentStep(4), 12000),
        setTimeout(() => setCurrentStep(5), 24000),
      ];
      const res = await fetch('/api/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      for (const t of tickers) clearTimeout(t);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 240)}`);
      }
      const data = await res.json();
      if (!data.ok) {
        setFailResult({
          reason: data.reason || 'Renewal pipeline returned ok:false',
          buildLog: data.buildLog,
          sourceDisclosure: data.sourceDisclosure,
          remediationPath: data.remediationPath,
        });
        setCurrentStep(STEPS.length);
        return;
      }
      setCurrentStep(STEPS.length);
      setReport(data.report);
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const reset = () => { setReport(null); setFailResult(null); setCurrentStep(null); setError(null); setSourceMode(null); };
  const running = currentStep != null && currentStep < STEPS.length && !error && !failResult;

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Wand2 className="h-7 w-7 text-primary" /> Renewal Workspace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Four input methods — URL · Description · Paste / Upload · Synthesize 2–5 URLs. FlowAI's Orchestra patches real source when available, or generates a working Vite-React product from spec, and deploys it to a real Vercel preview URL.
        </p>
      </motion.div>

      <AnimatePresence>
        {!report && !failResult && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <UrlCard onRenew={handleRenew} disabled={running} />
            <DescriptionCard onRenew={handleRenew} disabled={running} />
            <ContentCard onRenew={handleRenew} disabled={running} />
            <MultiUrlCard onRenew={handleRenew} disabled={running} />
          </motion.div>
        )}
      </AnimatePresence>

      <ProgressPanel currentStep={currentStep} error={error} sourceMode={sourceMode} />

      {failResult && <BuildFailedView result={failResult} onReset={reset} />}
      {report && <BeforeAfterView report={report} onReset={reset} />}
    </div>
  );
}
