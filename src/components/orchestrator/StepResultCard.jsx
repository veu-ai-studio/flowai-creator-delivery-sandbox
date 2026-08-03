import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, ExternalLink, Globe } from 'lucide-react';
import { safeStr } from '@/lib/safeStr';

function Tag({ label, color = 'bg-secondary/50 text-muted-foreground' }) {
  return <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${color}`}>{label}</span>;
}

function Section({ title, items, color = '' }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-0.5">
      <p className={`text-[10px] font-bold uppercase ${color || 'text-muted-foreground'}`}>{title}</p>
      {items.map((item, i) => (
        <p key={i} className="text-[10px] text-muted-foreground">• {typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item ?? '')}</p>
      ))}
    </div>
  );
}

// safeStr imported from @/lib/safeStr

const STEP_RENDERERS = {
  analyze: (r) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Tag label={r.productType} color="bg-primary/20 text-primary" />
        <Tag label={r.productName} color="bg-secondary text-foreground" />
      </div>
      {r.summary && <p className="text-[10px] text-muted-foreground italic">{r.summary}</p>}
      <Section title="UI Structure" items={r.uiStructure} />
      <Section title="Gaps" items={r.gaps} color="text-amber-400" />
    </div>
  ),
  plan: (r) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {r.techStack?.map((t, i) => <Tag key={i} label={t} color="bg-primary/10 text-primary" />)}
      </div>
      <p className="text-[10px] text-muted-foreground">{r.frontend?.framework} frontend · {r.backend?.language} backend · {r.database?.type}</p>
      {r.agents?.required && <Tag label="Agents required" color="bg-purple-500/20 text-purple-400" />}
      <Section title="APIs" items={r.backend?.apis?.map(a => typeof a === 'object' && a !== null ? `${safeStr(a.method)} ${safeStr(a.path)} — ${safeStr(a.description)}` : safeStr(a))} />
    </div>
  ),
  build: (r) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {r.serverCode && <Tag label="Server ✓" color="bg-emerald-500/20 text-emerald-400" />}
        {r.htmlCode && <Tag label="Frontend ✓" color="bg-emerald-500/20 text-emerald-400" />}
        {r.replit?.deployed && <Tag label="Replit ✓" color="bg-orange-500/20 text-orange-400" />}
        {!r.replit?.deployed && <Tag label={r.replit?.note || 'Replit N/A'} color="bg-secondary text-muted-foreground" />}
      </div>
      {r.replit?.url && (
        <a href={r.replit.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-primary hover:underline">
          <Globe className="h-3 w-3" />{r.replit.url}<ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
    </div>
  ),
  test: (r) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Tag label={r.overallPassed ? 'PASSED' : 'FAILED'} color={r.overallPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} />
        <Tag label={r.recommendation || ''} color="bg-secondary text-muted-foreground" />
      </div>
      {r.tests?.map((t, i) => {
        const tObj = typeof t === 'object' && t !== null ? t : { name: safeStr(t), passed: true };
        return (
          <div key={i} className="flex items-center gap-1.5 text-[10px]">
            {tObj.passed ? <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> : <XCircle className="h-3 w-3 text-red-400 shrink-0" />}
            <span className="text-muted-foreground">{safeStr(tObj.name)}</span>
            {tObj.details && <span className="text-muted-foreground/60">— {safeStr(tObj.details)}</span>}
          </div>
        );
      })}
    </div>
  ),
  audit: (r) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Tag label={r.classification} color="bg-primary/20 text-primary" />
        <Tag label={`Revenue: ${r.revenueReadiness}`} color={r.revenueReadiness === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[['Performance', r.performanceScore], ['Usability', r.usabilityScore], ['Completeness', r.completenessScore], ['Production', r.productionReadinessScore]].map(([l, v]) => (
          <div key={l} className="text-[10px] flex items-center justify-between px-2 py-1 rounded bg-secondary/20 border border-border/20">
            <span className="text-muted-foreground">{l}</span>
            <span className="font-bold text-foreground">{v}</span>
          </div>
        ))}
      </div>
      <Section title="Critical Gaps" items={r.criticalGaps} color="text-red-400" />
    </div>
  ),
  optimize: (r) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {r.updatedClassification && <Tag label={r.updatedClassification} color="bg-primary/20 text-primary" />}
        {r.estimatedScoreGain > 0 && <Tag label={`+${r.estimatedScoreGain} score`} color="bg-emerald-500/20 text-emerald-400" />}
      </div>
      <Section title="Improvements" items={r.improvements?.map(i =>
        typeof i === 'string' ? i : `[${i.impact || ''}] ${i.area || ''}: ${i.fix || i.issue || ''}`
      )} />
    </div>
  ),
  upgrade: (r) => (
    <div className="space-y-2">
      {r.versionTag && <Tag label={r.versionTag} color="bg-primary/20 text-primary font-mono" />}
      <Section title="Upgrades" items={r.upgrades?.map(u => typeof u === 'object' ? `${u.component || ''}: ${u.upgrade || ''} [${u.risk || ''} risk]` : safeStr(u))} />
    </div>
  ),
  deploy: (r) => (
    <div className="space-y-2">
      <Tag label={r.deployed ? 'DEPLOYED ✓' : 'FAILED'} color={r.deployed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} />
      {r.url && (
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-primary hover:underline font-mono">
          <Globe className="h-3 w-3" />{r.url}<ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
      {r.note && <p className="text-[10px] text-muted-foreground">{r.note}</p>}
    </div>
  ),
  mobile: (r) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Tag label={`PWA ${r.pwaReadiness}%`} color="bg-blue-500/20 text-blue-400" />
        <Tag label={`Native ${r.nativeReadiness}%`} color="bg-purple-500/20 text-purple-400" />
        <Tag label={r.nativeStrategy?.framework || 'Expo'} color="bg-secondary text-muted-foreground" />
      </div>
      <p className="text-[10px] text-muted-foreground">Strategy: {r.pwa?.serviceWorkerStrategy} · Install prompt: {r.pwa?.installPrompt ? 'yes' : 'no'}</p>
    </div>
  ),
  appstore: (r) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Tag label={`Apple ${r.appleReadiness?.score}%`} color="bg-secondary text-muted-foreground" />
        <Tag label={`Google ${r.googlePlayReadiness?.score}%`} color="bg-emerald-500/20 text-emerald-400" />
        <Tag label={`Samsung ${r.samsungReadiness?.score}%`} color="bg-blue-500/20 text-blue-400" />
      </div>
      {r.metadata?.title && <p className="text-[10px] text-foreground font-semibold">{r.metadata.title}</p>}
      {r.metadata?.category && <p className="text-[10px] text-muted-foreground">Category: {r.metadata.category}</p>}
    </div>
  ),
  output: (r) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Tag label={r.classification} color="bg-primary/20 text-primary" />
        <Tag label={`Score: ${r.readinessScore}`} color="bg-secondary text-muted-foreground" />
        <Tag label={`Revenue: ${r.revenueReadiness}`} color={r.revenueReadiness === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} />
      </div>
      {r.executiveSummary && <p className="text-[10px] text-muted-foreground italic">{r.executiveSummary.slice(0, 300)}…</p>}
      <Section title="Gap Report" items={r.gapReport?.map(g => `[${g.impact}] ${g.gap}`)} color="text-amber-400" />
      <Section title="Next Steps" items={r.nextSteps} color="text-emerald-400" />
    </div>
  ),
};

const STEP_LABELS = {
  analyze: 'Analysis', plan: 'Architecture', build: 'Build', test: 'Test Results',
  audit: 'Audit', optimize: 'Optimization', upgrade: 'Upgrade', deploy: 'Deployment',
  mobile: 'Mobile Strategy', appstore: 'App Store', output: 'Final Report',
};

export default function StepResultCard({ step, result, status }) {
  const [open, setOpen] = useState(step === 'output' || step === 'deploy');
  const renderer = STEP_RENDERERS[step];
  const label = STEP_LABELS[step] || step;

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${
      status === 'done' ? 'border-emerald-500/20 bg-emerald-500/5' :
      status === 'failed' ? 'border-red-500/20 bg-red-500/5' :
      'border-border bg-secondary/10'
    }`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 text-left">
        <span className="text-xs font-bold text-foreground flex-1">{label}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && renderer && (
        <div className="pt-1 border-t border-border/30">
          {renderer(result)}
        </div>
      )}
    </div>
  );
}
