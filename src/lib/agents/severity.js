// src/lib/agents/severity.js
//
// Severity-tier helpers used by Agent #3 Self-Renewal and its Executor
// to route issues through the auto-deploy vs Human Gate paths.
//
// Tiers (per spec §4.4 and CEO disposition Q3 = (a) keep 3-tier):
//   - 'critical' — never auto-deploys; Human Gate required
//   - 'high'     — never auto-deploys; Human Gate required
//   - 'medium'   — auto-deployable via fork-and-fix
//
// Note: the spec deliberately uses a 3-tier scale that mirrors
// issueDetector.js output. This is distinct from analyzeRun() flag
// severities ('low' | 'medium' | 'high') which target operational/build
// signals rather than user-facing claim accuracy. Names overlap; scales
// are separate. This module exclusively governs IssueDetector severities.
//
// ESM only. No side effects on import.

'use strict';

export const SEVERITY_TIERS = Object.freeze(['critical', 'high', 'medium']);

const HUMAN_GATE_TIERS = Object.freeze(new Set(['critical', 'high']));
const AUTO_DEPLOY_TIERS = Object.freeze(new Set(['medium']));

/**
 * Classify an issue into one of SEVERITY_TIERS.
 *
 * Accepts either:
 *   - an Issue object: { severity: 'critical'|'high'|'medium', ... }
 *   - a bare string: 'critical' | 'high' | 'medium'
 *
 * Returns the canonical tier string. Throws on unknown severities so
 * callers cannot accidentally route an unclassified issue.
 *
 * @param {object|string} issue
 * @returns {'critical'|'high'|'medium'}
 */
export function classifySeverity(issue) {
  const raw =
    typeof issue === 'string'
      ? issue
      : issue && typeof issue === 'object'
        ? issue.severity
        : null;
  if (typeof raw !== 'string' || !SEVERITY_TIERS.includes(raw)) {
    throw new Error(
      `classifySeverity: unknown severity "${raw}"; expected one of [${SEVERITY_TIERS.join(', ')}]`,
    );
  }
  return raw;
}

/**
 * Returns true iff the tier requires a Human Gate per Rev-2.1 §10.2.
 *
 * @param {string} tier
 * @returns {boolean}
 */
export function requiresHumanGate(tier) {
  return HUMAN_GATE_TIERS.has(tier);
}

/**
 * Returns true iff the tier is auto-deployable via fork-and-fix.
 *
 * @param {string} tier
 * @returns {boolean}
 */
export function autoDeployable(tier) {
  return AUTO_DEPLOY_TIERS.has(tier);
}

/**
 * Bulk-classify an issue list and partition it into auto-deployable
 * vs gated. Returns { autoDeploy: Issue[], gated: Issue[], unknown: any[] }.
 * `unknown` collects items whose severity field is missing or invalid;
 * callers should surface these rather than silently drop them.
 *
 * @param {Array<object>} issueList
 */
export function partitionByRouting(issueList) {
  const autoDeploy = [];
  const gated = [];
  const unknown = [];
  for (const issue of issueList ?? []) {
    let tier = null;
    try {
      tier = classifySeverity(issue);
    } catch {
      unknown.push(issue);
      continue;
    }
    if (autoDeployable(tier)) autoDeploy.push(issue);
    else if (requiresHumanGate(tier)) gated.push(issue);
    else unknown.push(issue);
  }
  return { autoDeploy, gated, unknown };
}
