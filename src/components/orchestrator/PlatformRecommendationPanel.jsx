import { useMemo, useState } from 'react';
import { CheckCircle2, CircleDot, LockKeyhole, SlidersHorizontal } from 'lucide-react';
import {
  FLOWAI_STEPS,
  ORCHESTRATION_MODE_MATURITY,
  ORCHESTRATION_MODES,
  PLATFORM_REGISTRY,
  buildOrchestrationPlan,
} from '@/lib/orchestratorFramework';

const MODE_LABELS = {
  [ORCHESTRATION_MODES.AUTO]: 'Auto',
  [ORCHESTRATION_MODES.GUIDED]: 'Guided',
  [ORCHESTRATION_MODES.MANUAL]: 'Manual',
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
  const [mode, setMode] = useState(ORCHESTRATION_MODES.AUTO);
  const [selections, setSelections] = useState({});

  const plan = useMemo(() => buildOrchestrationPlan({
    mode,
    registry: PLATFORM_REGISTRY,
    selections,
  }), [mode, selections]);

  const selectPlatform = (step, platformId) => {
    setSelections(current => ({ ...current, [step]: platformId }));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Orchestrator Framework v0.1
          </h2>
          <p className="text-[10px] text-muted-foreground mt-1">
            Deterministic platform routing. Live calls are stubbed; Auto mode is {ORCHESTRATION_MODE_MATURITY[ORCHESTRATION_MODES.AUTO]}.
          </p>
        </div>
        <div className="flex rounded-md border border-border overflow-hidden">
          {Object.values(ORCHESTRATION_MODES).map(value => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`px-3 py-1.5 text-xs font-semibold ${mode === value ? 'bg-primary text-primary-foreground' : 'bg-secondary/20 text-muted-foreground hover:text-foreground'}`}
            >
              {MODE_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

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
