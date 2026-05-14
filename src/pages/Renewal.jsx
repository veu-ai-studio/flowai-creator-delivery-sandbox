import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, MessageSquare, Upload, Wand2, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

// FlowAI Renewal Workspace — three-input pipeline.
//
// User picks one of three input methods:
//   A. URL              — point at a live URL, FlowAI crawls + renews
//   B. Describe Product — fill in structured fields, FlowAI normalizes + renews
//   C. Paste / Upload   — paste copy or upload PNG/JPG screenshots
//
// All three feed `/api/renew`, which returns a BeforeAfterReport.  The
// report's renewedUrl is iframed alongside the original in the
// before/after view.
//
// This page is product-agnostic — there are no hardcoded references to
// any specific product anywhere in the input panel, progress strings,
// or output renderer.

const STEPS = ['Adapting input', 'Detecting issues', 'Generating renewed preview', 'Building before/after report'];

function ProgressPanel({ currentStep, error }) {
  if (currentStep == null) return null;
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold text-primary uppercase tracking-wide">Renewal in progress</p>
      </div>
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
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}

function BeforeAfterView({ report, onReset }) {
  if (!report) return null;
  const { sideBySidePresentation: sbs, deltaScore, issuesBefore, issuesAfter, issuesResolved, issuesRemaining, limitations, renewedUrl, renewalType, patchesApplied } = report;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Before / After</h2>
          <p className="text-xs text-muted-foreground mt-1">Renewal type: <span className="font-mono">{renewalType}</span> · {patchesApplied?.length || 0} auto-fixable patches applied</p>
        </div>
        <Button size="sm" variant="outline" onClick={onReset}>Run another</Button>
      </div>

      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground whitespace-pre-wrap">
        <strong className="block text-amber-400 mb-1">LIMITATIONS — please read</strong>
        {limitations}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-bold">Original</p>
          <OriginalPanel panel={sbs.original} />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-bold">Renewed</p>
          <div className="rounded-lg border border-emerald-500/40 bg-card overflow-hidden">
            <iframe
              src={renewedUrl}
              title="Renewed preview"
              className="w-full h-[480px] border-0"
              sandbox="allow-same-origin"
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
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Patches applied</p>
          <p className="text-2xl font-bold mt-1">{patchesApplied?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Auto-fixable findings</p>
        </div>
      </div>

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
        {c.text && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pasted text</p>
            <pre className="text-xs whitespace-pre-wrap font-sans">{c.text}</pre>
          </div>
        )}
        {(c.attachments || []).map((a, idx) => (
          <div key={idx} className="border-t border-border pt-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{a.filename} · {a.mimeType}</p>
            {a.extractedText && <pre className="text-[11px] whitespace-pre-wrap mt-1 font-sans">{a.extractedText}</pre>}
          </div>
        ))}
      </div>
    );
  }
  return <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">No preview available.</div>;
}

// ─── Input cards ──────────────────────────────────────────────────────

function UrlCard({ onRenew, disabled }) {
  const [url, setUrl] = useState('');
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold uppercase tracking-wide">A. URL</p>
      </div>
      <p className="text-[11px] text-muted-foreground">Point FlowAI at any live URL. We crawl, detect issues, and produce a renewed static preview.</p>
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        className="h-9 text-sm"
        disabled={disabled}
      />
      <Button
        size="sm" className="w-full gap-2"
        disabled={disabled || !url.trim()}
        onClick={() => onRenew({ inputType: 'url', url: url.trim() })}
      >
        <Wand2 className="h-3.5 w-3.5" /> Analyze & Renew
      </Button>
    </div>
  );
}

function DescriptionCard({ onRenew, disabled }) {
  const [d, setD] = useState({
    productName: '', whatItDoes: '', targetAudience: '', keyFeatures: '',
    currentIssues: '', liveUrl: '', loginEmail: '', loginPassword: '',
  });
  const upd = (k) => (e) => setD((prev) => ({ ...prev, [k]: e.target.value }));
  const canSubmit = d.productName.trim() || d.whatItDoes.trim() || d.targetAudience.trim() || d.keyFeatures.trim();
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-amber-400" />
        <p className="text-sm font-bold uppercase tracking-wide">B. Describe Your Product</p>
      </div>
      <p className="text-[11px] text-muted-foreground">Fill in what you know. FlowAI normalizes and generates a renewed landing page.</p>
      <Input value={d.productName} onChange={upd('productName')} placeholder="Product name" className="h-8 text-xs" disabled={disabled} />
      <textarea value={d.whatItDoes} onChange={upd('whatItDoes')} placeholder="What it does (one paragraph)" rows={2} className="w-full text-xs p-2 rounded-md border border-input bg-background" disabled={disabled} />
      <Input value={d.targetAudience} onChange={upd('targetAudience')} placeholder="Target audience" className="h-8 text-xs" disabled={disabled} />
      <textarea value={d.keyFeatures} onChange={upd('keyFeatures')} placeholder="Key features (comma separated)" rows={2} className="w-full text-xs p-2 rounded-md border border-input bg-background" disabled={disabled} />
      <textarea value={d.currentIssues} onChange={upd('currentIssues')} placeholder="Current issues you've noticed (optional)" rows={2} className="w-full text-xs p-2 rounded-md border border-input bg-background" disabled={disabled} />
      <details className="text-[11px]">
        <summary className="text-muted-foreground cursor-pointer">Optional: live URL + credentials (session-only, never stored)</summary>
        <div className="mt-2 space-y-2">
          <Input value={d.liveUrl} onChange={upd('liveUrl')} placeholder="https://live-url.com (optional)" className="h-8 text-xs" disabled={disabled} />
          <Input value={d.loginEmail} onChange={upd('loginEmail')} type="email" placeholder="Login email (optional)" className="h-8 text-xs" disabled={disabled} />
          <Input value={d.loginPassword} onChange={upd('loginPassword')} type="password" placeholder="Login password (optional)" className="h-8 text-xs" disabled={disabled} />
          <p className="text-[10px] text-muted-foreground">Credentials are used only for this session and are never stored.</p>
        </div>
      </details>
      <Button
        size="sm" className="w-full gap-2"
        disabled={disabled || !canSubmit}
        onClick={() => onRenew({ inputType: 'description', description: d })}
      >
        <Wand2 className="h-3.5 w-3.5" /> Generate Renewed Version
      </Button>
    </div>
  );
}

function ContentCard({ onRenew, disabled }) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]); // [{filename, mimeType, size, base64}]
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
  const removeAttachment = (idx) => setAttachments((prev) => prev.filter((_, i) => i !== idx));
  const canSubmit = text.trim() || attachments.length > 0;
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-emerald-400" />
        <p className="text-sm font-bold uppercase tracking-wide">C. Paste Content or Upload Screenshots</p>
      </div>
      <p className="text-[11px] text-muted-foreground">Paste copy or upload PNG/JPG screenshots. FlowAI OCRs the images, normalizes, and renews.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your copy here…" rows={5} className="w-full text-xs p-2 rounded-md border border-input bg-background" disabled={disabled} />
      <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={onFile} className="text-xs" disabled={disabled} />
      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className="truncate flex-1">{a.filename}</span>
              <span className="text-muted-foreground">{Math.round(a.size / 1024)} KB</span>
              <button onClick={() => removeAttachment(i)} className="text-red-400">×</button>
            </div>
          ))}
        </div>
      )}
      <Button
        size="sm" className="w-full gap-2"
        disabled={disabled || !canSubmit}
        onClick={() => onRenew({ inputType: 'content', content: { text: text.trim(), attachments } })}
      >
        <Wand2 className="h-3.5 w-3.5" /> Renew Content
      </Button>
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────

export default function Renewal() {
  const [currentStep, setCurrentStep] = useState(null); // null | 0..3
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const handleRenew = async (payload) => {
    setError(null);
    setReport(null);
    setCurrentStep(0);
    try {
      // Steps 0..2 are visual placeholders; the server orchestrates the
      // full pipeline in one call.  We advance the progress dots while
      // the request is in flight.
      const advance = (idx) => setCurrentStep(idx);
      const ticker = [
        setTimeout(() => advance(1), 1200),
        setTimeout(() => advance(2), 2800),
        setTimeout(() => advance(3), 4400),
      ];
      const res = await fetch('/api/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      for (const t of ticker) clearTimeout(t);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 240)}`);
      }
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.reason || 'Renewal pipeline returned ok:false');
      }
      setCurrentStep(STEPS.length);
      setReport(data.report);
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const reset = () => { setReport(null); setCurrentStep(null); setError(null); };
  const running = currentStep != null && currentStep < STEPS.length && !error;

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Wand2 className="h-7 w-7 text-primary" /> Renewal Workspace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Three ways to bring an input — URL, description, or pasted content / screenshots. FlowAI detects issues, generates a renewed preview, and shows side-by-side before/after.
        </p>
      </motion.div>

      <AnimatePresence>
        {!report && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <UrlCard onRenew={handleRenew} disabled={running} />
            <DescriptionCard onRenew={handleRenew} disabled={running} />
            <ContentCard onRenew={handleRenew} disabled={running} />
          </motion.div>
        )}
      </AnimatePresence>

      <ProgressPanel currentStep={currentStep} error={error} />

      {report && <BeforeAfterView report={report} onReset={reset} />}
    </div>
  );
}
