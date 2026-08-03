import { useMemo, useState } from 'react';
import { CheckCircle2, CircleDot, LockKeyhole, Play, SlidersHorizontal } from 'lucide-react';
import {
  CONTROL_DEPTHS,
  CONTROL_STRUCTURES,
  DEFAULT_CONTROL_SCHEME,
  FLOWAI_STEPS,
  ORCHESTRATION_MODE_MATURITY,
  ORCHESTRATION_MODES,
  PLATFORM_REGISTRY,
  buildOrchestrationPlan,
  createUserInitiationToken,
  validateRunStart,
} from '@/lib/orchestratorFramework';

const MODE_LABELS = {
  [ORCHESTRATION_MODES.AUTO]: 'Auto',
  [ORCHESTRATION_MODES.GUIDED]: 'Guided',
  [ORCHESTRATION_MODES.MANUAL]: 'Manual',
};

const STRUCTURE_LABELS = {
  [CONTROL_STRUCTURES.AUTONOMOUS]: 'Autonomous',
  [CONTROL_STRUCTURES.SUPERVISED]: 'Supervised',
  [CONTROL_STRUCTURES.CONTROLLED]: 'Controlled',
};

const DEPTH_LABELS = {
  [CONTROL_DEPTHS.QUICK]: 'Quick',
  [CONTROL_DEPTHS.NORMAL]: 'Normal',
  [CONTROL_DEPTHS.DEEP]: 'Deep',
};

function PlatformPill({ platform, selected }) {
  const costRank = platform.costRank?.value ?? 'unknown';
  const performanceRank = platform.performanceRank?.value ?? 'unknown';

  return (
    <div className={`rounded-md border px-2 py-1.5 text-[10px] ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/20 text-muted-foreground'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold truncate">{platform.label}</span>
        <span className="font-mono">{platform.routingScore ?? 'manual'}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span>cost {costRank}</span>
        <span>perf {performanceRank}</span>
        <span>{platform.status}</span>
        {!platform.liveEnabled && <LockKeyhole className="h-3 w-3" aria-label="live calls stubbed" />}
      </div>
    </div>
  );
}

export default function PlatformRecommendationPanel() {
  const [structure, setStructure] = useState(/** @type {string} */ (DEFAULT_CONTROL_SCHEME.structure));
  const [mode, setMode] = useState(/** @type {string} */ (DEFAULT_CONTROL_SCHEME.mode));
  const [depth, setDepth] = useState(/** @type {string} */ (DEFAULT_CONTROL_SCHEME.depth));
  const [initiationToken, setInitiationToken] = useState(/** @type {any} */ (null));
  const [selections, setSelections] = useState(/** @type {Record<string, any>} */ ({}));

  const plan = /** @type {any[]} */ (useMemo(() => buildOrchestrationPlan({
    mode: /** @type {any} */ (mode),
    registry: PLATFORM_REGISTRY,
    selections,
  }), [mode, selections]));

  const selectPlatform = (step, platformId) => {
    setSelections(current => ({ ...current, [step]: platformId }));
  };

  const validation = /** @type {any} */ (validateRunStart({
    controlScheme: { structure, mode, depth },
    userInitiationToken: initiationToken,
  }));

  const applyRecommended = () => {
    setStructure(DEFAULT_CONTROL_SCHEME.structure);
    setMode(DEFAULT_CONTROL_SCHEME.mode);
    setDepth(DEFAULT_CONTROL_SCHEME.depth);
    setInitiationToken(null);
  };

  const setStructureWithTokenReset = value => {
    setStructure(value);
    if (value !== CONTROL_STRUCTURES.AUTONOMOUS) setInitiationToken(null);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Orchestrator Framework
          </h2>
          <p className="text-[10px] text-muted-foreground mt-1">
            Deterministic platform routing. Live calls are stubbed; Auto mode is {ORCHESTRATION_MODE_MATURITY[ORCHESTRATION_MODES.AUTO]}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyRecommended}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Play className="h-3.5 w-3.5" />
            Recommended
          </button>
          {structure === CONTROL_STRUCTURES.AUTONOMOUS && (
            <button
              type="button"
              onClick={() => setInitiationToken(createUserInitiationToken())}
              className={`h-8 rounded-md border px-3 text-xs font-semibold ${initiationToken ? 'border-emerald-500/40 text-emerald-400' : 'border-border text-muted-foreground'}`}
            >
              {initiationToken ? 'Initiated' : 'Confirm'}
            </button>
          )}
        </div>
      </div>

      <details className="rounded-lg border border-border bg-background/40 p-3">
        <summary className="cursor-pointer text-xs font-bold text-foreground">Power controls</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Structure
            <select
              value={structure}
              onChange={event => setStructureWithTokenReset(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-xs normal-case text-foreground"
            >
              {Object.values(CONTROL_STRUCTURES).map(value => (
                <option key={value} value={value}>{STRUCTURE_LABELS[value]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Mode
            <select
              value={mode}
              onChange={event => setMode(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-xs normal-case text-foreground"
            >
              {Object.values(ORCHESTRATION_MODES).map(value => (
                <option key={value} value={value}>{MODE_LABELS[value]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Depth
            <select
              value={depth}
              onChange={event => setDepth(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-xs normal-case text-foreground"
            >
              {Object.values(CONTROL_DEPTHS).map(value => (
                <option key={value} value={value}>{DEPTH_LABELS[value]}</option>
              ))}
            </select>
          </label>
        </div>
      </details>

      {validation.error && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">
          {validation.reason}
        </div>
      )}

      <div className="grid gap-3">
        {plan.map(stepPlan => {
          const selectedId = stepPlan.selected?.id ?? selections[stepPlan.step] ?? null;
          return (
            <div key={stepPlan.step} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  {stepPlan.selected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <CircleDot className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-foreground">{stepPlan.step}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {stepPlan.selected ? stepPlan.selected.why : 'Select a platform for this step.'}
                    </p>
                  </div>
                </div>
                {mode !== ORCHESTRATION_MODES.AUTO && (
                  <select
                    value={selectedId ?? ''}
                    onChange={event => selectPlatform(stepPlan.step, event.target.value)}
                    className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
                  >
                    <option value="">Choose platform</option>
                    {stepPlan.recommendations.map(platform => (
                      <option key={platform.id} value={platform.id}>{platform.label}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {stepPlan.recommendations.slice(0, mode === ORCHESTRATION_MODES.MANUAL ? FLOWAI_STEPS.length : 3).map(platform => (
                  <PlatformPill
                    key={platform.id}
                    platform={platform}
                    selected={selectedId === platform.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
