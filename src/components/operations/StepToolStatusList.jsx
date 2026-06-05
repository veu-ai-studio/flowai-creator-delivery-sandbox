import React from 'react';
import { rankedToolsForStepCard } from '../../lib/tools/stepToolVisibility';

const TONES = {
  callable: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
  missing_credentials: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
  unavailable: 'border-slate-500/30 bg-slate-500/5 text-slate-300',
  stub_unavailable: 'border-slate-500/30 bg-slate-500/5 text-slate-300',
  pending_operator_gate: 'border-blue-500/30 bg-blue-500/5 text-blue-300',
  mutation_deferred_until_P13C: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
  blocked: 'border-red-500/30 bg-red-500/5 text-red-300',
};

const LABELS = {
  callable: 'callable',
  missing_credentials: 'missing credentials',
  unavailable: 'unavailable',
  stub_unavailable: 'stub unavailable',
  pending_operator_gate: 'pending approval',
  mutation_deferred_until_P13C: 'deferred',
  blocked: 'blocked',
};

export default function StepToolStatusList({ stepKey, toolSelection = null, compact = false }) {
  const tools = rankedToolsForStepCard(stepKey, toolSelection);
  if (tools.length === 0) return null;

  return (
    <div className={compact ? 'mt-2 flex flex-wrap gap-1.5' : 'mt-3 grid gap-2'}>
      {tools.map((tool) => {
        const state = tool.dispatchState ?? 'unavailable';
        return (
          <div
            key={`${stepKey}-${tool.rank}-${tool.platform_name}`}
            className={`rounded-md border px-2 py-1 ${TONES[state] ?? TONES.unavailable}`}
            title={tool.note || LABELS[state] || state}
          >
            <span className="text-[10px] font-semibold">
              {tool.rank}. {tool.platform_name}
            </span>
            <span className="ml-1 text-[9px] uppercase opacity-80">
              {LABELS[state] ?? state}
            </span>
          </div>
        );
      })}
    </div>
  );
}
