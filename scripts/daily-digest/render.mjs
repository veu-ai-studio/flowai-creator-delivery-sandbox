// scripts/daily-digest/render.mjs
//
// Consumes the state object from collect.mjs and emits a CEO-ready
// markdown digest. Section order is fixed per dispatch spec. Every
// section degrades gracefully — empty data sources render as "None
// in window" instead of failing.

const MAX_WINS = 8;
const MAX_PARKING_LOT = 6;
const MAX_PANEL_VERDICTS = 4;
const MAX_DECISIONS = 5;
const MAX_SOFT_SIGNALS = 4;

function dot(state) {
  switch (state) {
    case 'PASS':     return '🟢';
    case 'DEGRADED': return '🟡';
    case 'FAILED':   return '🔴';
    default:         return '⚪';
  }
}

function joinOrNone(lines) {
  if (!lines || lines.length === 0) return '- _None in window._';
  return lines.join('\n');
}

function renderWins(commits) {
  if (!commits || commits.length === 0) return '- _None in window._';
  // Filter out chore/docs(parking-lot)-only entries so wins emphasize substantive work.
  // The renderer doesn't suppress them entirely; it just prioritises non-trivial first.
  const substantive = commits.filter((c) => !/^(chore|docs\(parking-lot\))/i.test(c.subject));
  const trivial = commits.filter((c) => /^(chore|docs\(parking-lot\))/i.test(c.subject));
  const ordered = [...substantive, ...trivial].slice(0, MAX_WINS);
  return ordered.map((c) => `- \`${c.hash}\` ${truncSubject(c.subject)} _(${c.relativeTime})_`).join('\n');
}

function truncSubject(s) {
  if (!s) return '(no subject)';
  const idx = s.indexOf('\n');
  const oneLine = idx === -1 ? s : s.slice(0, idx);
  return oneLine.length > 120 ? oneLine.slice(0, 117) + '…' : oneLine;
}

function renderInFlight(lock) {
  if (!lock) return '- _No worker holds the stage lock right now._';
  const age = lock.ageSeconds < 60
    ? `${lock.ageSeconds}s`
    : `${Math.round(lock.ageSeconds / 60)}m`;
  const staleNote = lock.stale ? ' **(stale — may be abandoned)**' : '';
  return `- Worker **${lock.owner}** holds the stage lock since ${lock.ts} (${age} elapsed)${staleNote}.`;
}

function renderDecisions(items) {
  if (!items || items.length === 0) return '- _No open decisions surfaced from parking lot or recent Panel docs._';
  return items.slice(0, MAX_DECISIONS).map((it, i) =>
    `${i + 1}. **${it.ref}** — ${it.oneLiner}`
  ).join('\n');
}

function renderDeployed(health) {
  const lines = [
    `- 🌐 Live URL: <${health.liveUrl}>`,
    `- ${dot(health.status)} Health: **${health.status}**` + (health.reasons?.length ? ` — ${health.reasons.join('; ')}` : ''),
    `- Commit: ${health.commit ? '`' + health.commit + '`' : '_unknown_'}`,
    `- Feature flags: ${health.featureFlagSummary ?? '_unknown_'}`,
  ];
  return lines.join('\n');
}

function renderParkingLot(entries) {
  if (!entries || entries.length === 0) return '- _Parking lot is empty._';
  // Most-recent ID first (descending id).
  const sorted = [...entries].sort((a, b) => Number(b.id) - Number(a.id));
  return sorted.slice(0, MAX_PARKING_LOT).map((e) => {
    const desc = e.description.slice(0, 140) + (e.description.length > 140 ? '…' : '');
    return `- **ENTRY ${e.id}** (${e.date}): ${desc} — _${truncDisposition(e.disposition)}_`;
  }).join('\n');
}

function truncDisposition(d) {
  if (!d) return 'unknown';
  return d.length > 80 ? d.slice(0, 77) + '…' : d;
}

function renderPanelVerdicts(items) {
  if (!items || items.length === 0) return '- _No Panel consultations in last 7 days._';
  return items.slice(0, MAX_PANEL_VERDICTS).map((v) => {
    const sm = v.supermajority?.hit ? ' **(supermajority)**' : (v.supermajority ? ` (${v.supermajority.got}/${v.supermajority.total} engaged)` : '');
    const cd = v.needsCEODisposition ? ' — _needs CEO disposition_' : '';
    return `- \`${v.file}\` → verdict: **${v.verdict}**${sm}${cd}`;
  }).join('\n');
}

function renderSSOTState({ latestVersion, promotions }) {
  const lines = [];
  lines.push(`- Latest canonical version: ${latestVersion ?? '_unknown_'}`);
  if (!promotions || promotions.length === 0) {
    lines.push('- Promoted since last digest: _none_');
  } else {
    lines.push('- Promoted since last digest:');
    for (const p of promotions) {
      lines.push(`  - ENTRY ${p.id} (${p.date}): ${p.title}`);
    }
  }
  return lines.join('\n');
}

function renderSoftSignals(panelVerdicts, parkingLot, inFlightLock) {
  const out = [];
  // Pull explicit soft-signal flags from recent Panel docs.
  for (const v of panelVerdicts.items ?? []) {
    for (const flag of v.softSignals ?? []) {
      out.push(`- _(panel)_ \`${v.file}\` — ${flag}`);
      if (out.length >= MAX_SOFT_SIGNALS) break;
    }
    if (out.length >= MAX_SOFT_SIGNALS) break;
  }
  // Age-based parking-lot escalation: NEW entries older than 7 days.
  const sevenDayAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const e of parkingLot.entries ?? []) {
    if (out.length >= MAX_SOFT_SIGNALS) break;
    if (!/^NEW/i.test(e.disposition)) continue;
    const dateMatch = e.date.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    const entryTime = Date.parse(dateMatch[1]);
    if (Number.isFinite(entryTime) && entryTime < sevenDayAgo) {
      out.push(`- ⚠️ ENTRY ${e.id} has been NEW for >7 days without disposition.`);
    }
  }
  // Stale lock warning.
  if (inFlightLock?.stale && out.length < MAX_SOFT_SIGNALS) {
    out.push(`- ⚠️ Stage lock is stale (owner ${inFlightLock.owner}, age ${inFlightLock.ageSeconds}s) — worker may be abandoned.`);
  }
  if (out.length === 0) return '- _None._';
  return out.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// Top-level render()
// ─────────────────────────────────────────────────────────────────────────

export function render(state) {
  const lines = [
    `# FlowAI Daily Digest — ${state.date}`,
    '',
    state.marker.isFirstRun
      ? '_First-run snapshot. Future digests will report deltas since this baseline._'
      : `_Deltas since ${state.marker.previousTimestamp} (commit \`${(state.marker.previousCommit || '').slice(0, 8)}\`)._`,
    '',
    '## ✅ Wins Since Last Digest',
    '',
    renderWins(state.recentCommits),
    '',
    '## 🚧 In-Flight Right Now',
    '',
    renderInFlight(state.inFlightLock),
    '',
    '## 📋 Your Open Decisions',
    '',
    renderDecisions(state.outstandingDecisions),
    '',
    '## 🟢 Deployed FlowAI Status',
    '',
    renderDeployed(state.deployedHealth),
    '',
    '## 📝 Parking Lot Snapshot',
    '',
    renderParkingLot(state.parkingLot.entries),
    '',
    '## 🎯 Recent Panel Verdicts',
    '',
    renderPanelVerdicts(state.panelVerdicts.items),
    '',
    '## 📜 SSOT Canonical State',
    '',
    renderSSOTState(state.ssotPromotions),
    '',
    '## ⚠️ Soft Signals + Risks',
    '',
    renderSoftSignals(state.panelVerdicts, state.parkingLot, state.inFlightLock),
    '',
    '---',
    `*Generated ${state.ts} by W5b daily-digest. Next digest auto-generated daily; manual trigger via \`npm run digest\`.*`,
    '',
  ];
  return lines.join('\n');
}

// Exported for tests + ad-hoc renderer probes.
export const __test = {
  renderWins, renderInFlight, renderDecisions, renderDeployed,
  renderParkingLot, renderPanelVerdicts, renderSSOTState, renderSoftSignals,
  truncSubject, truncDisposition, dot,
};
