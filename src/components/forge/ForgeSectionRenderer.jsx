import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, FileText, Minus, XCircle } from 'lucide-react';

const STATUS_LABELS = {
  PASS: 'Pass',
  FAIL: 'Fail',
  ADVISORY_ONLY: 'Advisory',
  NOT_APPLICABLE: 'N/A',
  BATCH_PLAN_FROM_AUDIT: 'Batch Plan',
  BATCH_PLAN_APPROXIMATE: 'Approximate',
};

function isPending(value) {
  return value === null || value === undefined || value === '' || value === false;
}

function hasOwn(value, key) {
  return Object.hasOwn(value ?? {}, key);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !(value instanceof Date);
}

function humanLabel(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function toolSource(item) {
  return isObject(item?.selection) ? item.selection : item;
}

function toolName(item) {
  const tool = toolSource(item);
  return tool?.platform_name ?? tool?.toolName ?? tool?.name ?? item?.platform_name ?? item?.toolName ?? item?.name ?? 'Unnamed tool';
}

function toolType(item) {
  const tool = toolSource(item);
  return tool?.platform_type ?? tool?.type ?? tool?.category ?? 'tool';
}

function toolScore(item) {
  const tool = toolSource(item);
  return tool?.compositeScore ?? tool?.rankScore ?? tool?.performance_score ?? item?.compositeScore ?? item?.rank ?? 'n/a';
}

function hasToolListShape(value) {
  if (!Array.isArray(value) || value.length === 0 || !isObject(value[0])) return false;
  const item = value[0];
  const tool = toolSource(item);
  return item.compositeScore !== undefined ||
    item.rank !== undefined ||
    item.platform_name !== undefined ||
    item.selection !== undefined ||
    tool?.compositeScore !== undefined ||
    tool?.rank !== undefined ||
    tool?.platform_name !== undefined;
}

function hasSingleToolShape(value) {
  return isObject(value) && (
    value.platform_name !== undefined ||
    value.compositeScore !== undefined ||
    value.selection !== undefined
  );
}

function statusTone(status) {
  if (status === 'PASS') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'FAIL') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (status === 'NOT_APPLICABLE') return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
  if (status === 'BATCH_PLAN_FROM_AUDIT') return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
}

function StatusIcon({ status, className = 'h-4 w-4' }) {
  if (status === 'PASS') return <CheckCircle2 className={className} aria-hidden="true" />;
  if (status === 'FAIL') return <XCircle className={className} aria-hidden="true" />;
  if (status === 'NOT_APPLICABLE') return <Minus className={className} aria-hidden="true" />;
  if (status === 'BATCH_PLAN_FROM_AUDIT' || status === 'BATCH_PLAN_APPROXIMATE') return <FileText className={className} aria-hidden="true" />;
  return <AlertTriangle className={className} aria-hidden="true" />;
}

function Pending() {
  return (
    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" aria-hidden="true" />
      Pending — runs after submit
    </p>
  );
}

function Unsupported() {
  return (
    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      Unsupported section type
    </p>
  );
}

function AdvisoryBanner({ children = 'Advisory mode — build blocked' }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      {children}
    </div>
  );
}

function ToolList({ value }) {
  const tools = [...value].sort((a, b) => {
    const rankA = Number(toolSource(a)?.rank ?? a.rank ?? Number.POSITIVE_INFINITY);
    const rankB = Number(toolSource(b)?.rank ?? b.rank ?? Number.POSITIVE_INFINITY);
    if (rankA !== rankB) return rankA - rankB;

    const scoreA = Number(toolSource(a)?.compositeScore ?? a.compositeScore ?? Number.NEGATIVE_INFINITY);
    const scoreB = Number(toolSource(b)?.compositeScore ?? b.compositeScore ?? Number.NEGATIVE_INFINITY);
    if (scoreA !== scoreB) return scoreB - scoreA;

    return toolName(a).localeCompare(toolName(b));
  });

  return (
    <div className="space-y-2">
      {tools.map((item, index) => {
        const tool = toolSource(item);
        const rank = tool?.rank ?? item.rank ?? index + 1;
        return (
          <div key={`${toolName(item)}-${rank}-${index}`} className="rounded-md border border-border bg-background/50 p-3">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-semibold text-foreground">{rank}. {toolName(item)} — {toolType(item)}</p>
              <p className="text-xs text-muted-foreground">Score: {toolScore(item)}</p>
            </div>
            {(tool?.metadataStatus ?? item.metadataStatus) === 'MISSING_REGISTRY_METADATA' && (
              <p className="mt-2 text-xs text-muted-foreground">Limited metadata</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ToolCard({ value }) {
  const tool = toolSource(value);
  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <p className="text-sm font-bold text-foreground">{toolName(value)}</p>
      <div className="mt-2 grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
        <span>Type: {tool?.platform_type ?? 'tool'}</span>
        <span>Score: {tool?.compositeScore ?? 'n/a'}</span>
        <span>Rank: {tool?.rank ?? 'n/a'}</span>
      </div>
    </div>
  );
}

function AuditStatus({ value }) {
  return (
    <div className="space-y-2">
      <span className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] font-semibold ${statusTone(value.status)}`}>
        <StatusIcon status={value.status} />
        {STATUS_LABELS[value.status] ?? value.status}
      </span>
      {value.label && <p className="text-sm font-semibold text-foreground">{value.label}</p>}
      {value.reason && <p className="text-sm text-muted-foreground">{value.reason}</p>}
    </div>
  );
}

function AuditCheckList({ value }) {
  const passed = value.filter(item => item.status === 'PASS').length;
  const failed = value.filter(item => item.status === 'FAIL').length;
  const advisory = value.filter(item => item.status === 'ADVISORY_ONLY').length;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">{passed} passed · {failed} failed · {advisory} advisory</p>
      <div className="grid gap-2">
        {value.map((item, index) => (
          <div key={item.id ?? index} className="rounded-md border border-border bg-background/50 p-3">
            <AuditStatus value={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CompleteStatus({ value }) {
  const status = value.complete && value.verified ? 'verified' : value.complete ? 'unverified' : 'fail';
  const tone = status === 'verified'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : status === 'unverified'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : 'border-red-500/30 bg-red-500/10 text-red-200';
  const label = status === 'verified' ? 'Verified' : status === 'unverified' ? 'Unverified' : 'Incomplete';
  const Icon = status === 'verified' ? CheckCircle2 : status === 'unverified' ? AlertTriangle : XCircle;

  return (
    <div className="space-y-2">
      <span className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] font-semibold ${tone}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </span>
      {value.reason && <p className="text-sm text-muted-foreground">{value.reason}</p>}
    </div>
  );
}

function displayScalar(value) {
  if (value instanceof Date) return value.toLocaleString();
  if (value === true) return 'Yes';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return '[nested object]';
}

function KeyValueList({ value, depth = 0, unrecognized = false }) {
  const className = unrecognized
    ? 'grid gap-2 rounded-md border border-slate-500/30 bg-slate-500/5 p-3 text-sm'
    : 'grid gap-2 text-sm';

  return (
    <dl className={className}>
      {Object.entries(value).map(([key, item]) => (
        <div key={key} className="grid gap-1 md:grid-cols-[12rem_1fr]">
          <dt className="font-semibold text-foreground">{humanLabel(key)}</dt>
          <dd className="text-muted-foreground">
            {depth >= 1 || isPending(item) || !isObject(item)
              ? displayScalar(isPending(item) ? 'Pending' : item)
              : <KeyValueList value={item} depth={depth + 1} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ObjectList({ value }) {
  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {value.map((item, index) => (
        <div key={item.id ?? item.surfaceId ?? index} className="p-3">
          <KeyValueList value={item} depth={1} />
        </div>
      ))}
    </div>
  );
}

function Envelope({ value }) {
  const banners = [];
  if (value.undServedAccessWarning === true) {
    banners.push(<AdvisoryBanner key="underserved">Underserved access constraint applied</AdvisoryBanner>);
  }
  if (Array.isArray(value.pipelineNullAt) && value.pipelineNullAt.length > 0) {
    banners.push(<p key="pipeline" className="text-sm text-muted-foreground">Pipeline gaps at steps: {value.pipelineNullAt.join(', ')}</p>);
  }

  return (
    <div className="space-y-3">
      {banners}
      <ForgeSectionRenderer value={value.selection} />
      {Array.isArray(value.candidates) &&
        value.candidates.length > 1 && (
          <div className="space-y-1.5 rounded-md border border-border bg-card/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ranked candidates ({value.candidates.length})
            </p>
            <ol className="space-y-1 text-sm">
              {value.candidates.map((tool, index) => {
                const pickedNames = Array.isArray(value?.selection)
                  ? [toolSource(value.selection[0])?.platform_name].filter(Boolean)
                  : [value?.selection?.platform_name].filter(Boolean);
                const isPicked =
                  typeof tool?.platform_name === 'string' &&
                  pickedNames.includes(tool.platform_name);
                return (
                  <li
                    key={tool?.platform_name ?? index}
                    className={isPicked
                      ? 'flex items-center gap-2 font-semibold text-foreground'
                      : 'flex items-center gap-2 text-muted-foreground'}
                  >
                    <span className="font-mono text-xs">{index + 1}.</span>
                    <span>{tool?.platform_name ?? 'unknown'}</span>
                    {tool?.platform_type && (
                      <span className="text-xs text-muted-foreground">- {tool.platform_type}</span>
                    )}
                    {typeof tool?.compositeScore === 'number' && (
                      <span className="ml-auto font-mono text-xs">{tool.compositeScore.toFixed(1)}</span>
                    )}
                    {isPicked && (
                      <span
                        className="text-xs text-emerald-500"
                        aria-label="Selected"
                        title="Selected"
                      >
                        ★ Selected
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}
    </div>
  );
}

export function getSectionStatus(value) {
  if (isPending(value)) return 'pending';
  if (value?.toolSelectionAdvisory === true) return 'advisory';
  if (value?.complete === true && value?.verified === true) return 'verified';
  if (value?.complete === true && value?.verified === false) return 'unverified';
  if (value?.status === 'PASS') return 'pass';
  if (value?.status === 'FAIL') return 'fail';
  if (value?.status === 'ADVISORY_ONLY') return 'advisory';
  if (value?.status === 'NOT_APPLICABLE') return 'not-applicable';
  return 'unknown';
}

export function scoreTone(percent) {
  const value = Number(percent ?? 0);
  if (value < 50) return 'red';
  if (value < 95) return 'amber';
  return 'green';
}

export function ScoreDisplay({ percent }) {
  const tone = scoreTone(percent);
  const color = tone === 'green' ? 'text-emerald-300' : tone === 'amber' ? 'text-amber-300' : 'text-red-300';
  return (
    <div aria-label={`Score ${percent} percent`} className={`text-lg font-bold ${color}`}>
      Score: {percent}%
    </div>
  );
}

export function SectionStatusIcon({ status }) {
  const normalized = status === 'pass' ? 'verified' : status;
  const label = {
    verified: 'Verified',
    unverified: 'Unverified',
    advisory: 'Advisory',
    fail: 'Failed',
    'not-applicable': 'Not applicable',
    pending: 'Pending',
    unknown: 'Pending',
  }[normalized] ?? 'Pending';
  const className = normalized === 'verified'
    ? 'h-4 w-4 text-emerald-400'
    : normalized === 'unverified' || normalized === 'advisory'
      ? 'h-4 w-4 text-amber-400'
      : normalized === 'fail'
        ? 'h-4 w-4 text-red-400'
        : 'h-4 w-4 text-muted-foreground';
  const Icon = normalized === 'verified'
    ? CheckCircle2
    : normalized === 'unverified' || normalized === 'advisory'
      ? AlertTriangle
      : normalized === 'fail'
        ? XCircle
        : normalized === 'not-applicable'
          ? Minus
          : Clock;

  return (
    <span aria-label={label} title={label} className="inline-flex">
      <Icon className={className} aria-hidden="true" />
    </span>
  );
}

export default function ForgeSectionRenderer({ value }) {
  if (isPending(value)) return <Pending />;

  if (typeof value === 'function') {
    if (import.meta.env?.DEV) console.warn('[ForgeSectionRenderer] Unsupported section type', typeof value);
    return <Unsupported />;
  }

  if (typeof value === 'number') return <p className="text-sm text-foreground">{value}</p>;
  if (value === true) return <p className="text-sm text-foreground">Yes</p>;
  if (value instanceof Date) return <p className="text-sm text-foreground">{value.toLocaleString()}</p>;

  // Must precede status-object check (Rule 9) — advisory takes precedence.
  if (isObject(value) && value.toolSelectionAdvisory === true) return <AdvisoryBanner />;

  if (isObject(value) && typeof value.mode === 'string' && typeof value.stepKey === 'string' && hasOwn(value, 'selection')) {
    return <Envelope value={value} />;
  }

  if (hasToolListShape(value)) return <ToolList value={value} />;

  if (hasSingleToolShape(value)) return <ToolCard value={value} />;

  if (Array.isArray(value) && value.length > 0 && value[0]?.status !== undefined) return <AuditCheckList value={value} />;

  if (isObject(value) && STATUS_LABELS[value.status]) return <AuditStatus value={value} />;

  if (isObject(value) && typeof value.complete === 'boolean' && typeof value.verified === 'boolean') return <CompleteStatus value={value} />;

  if (Array.isArray(value) && value.length > 0 && isObject(value[0])) return <ObjectList value={value} />;

  if (typeof value === 'string') return <p className="text-sm text-foreground">{value}</p>;

  if (isObject(value)) return <KeyValueList value={value} unrecognized />;

  return <Unsupported />;
}
