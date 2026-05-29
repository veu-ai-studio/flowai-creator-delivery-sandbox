// src/lib/remediation/escalationRegistry.js — PHASE B2 STEP 1
//
// Defines the domains and finding shapes that MUST escalate to human
// review — never auto-remediated regardless of the strategy registry's
// risk classification.
//
// Hard guard: any finding whose category, dimension, or evidence text
// matches one of these patterns is forced into the ESCALATE bucket even
// if its strategy carries autoRemediable=true.
//
// Source of truth for "FlowAI never auto-touches X" — this file is the
// single grep target for security/compliance audits.

'use strict';

/**
 * Domains FlowAI's auto-remediation will not act on in v1.
 * Forced to ESCALATE regardless of strategy.
 */
export const ESCALATE_DIMENSIONS = Object.freeze(new Set([
  'security',
  'privacy_jurisdiction',
  'legal_jurisdiction',
]));

/**
 * Category-level escalation. Match is case-insensitive, prefix-aware:
 * a finding whose category startsWith any of these tokens is escalated.
 */
export const ESCALATE_CATEGORY_PREFIXES = Object.freeze([
  // Auth / session
  'auth:', 'session:', 'login:', 'oauth:', 'mfa:', 'jwt:',
  // Payments / billing
  'payment:', 'stripe:', 'billing:', 'checkout:',
  // Security-flavoured
  'csp:', 'csrf:', 'xss:', 'sqli:', 'security:', 'cors:', 'cookie:',
  // Architectural / data model
  'schema:', 'migration:', 'state-machine:', 'invariant:',
]);

/**
 * Evidence-text heuristics. Findings whose description/evidence contains
 * one of these phrases (case-insensitive substring) escalate even when
 * the category is otherwise auto-remediable. Conservative: only the
 * most obviously sensitive substrings.
 */
export const ESCALATE_EVIDENCE_SUBSTRINGS = Object.freeze([
  'authorization', 'password', 'secret', 'credential',
  'token', 'cookie', 'session id',
  'pii', 'gdpr', 'hipaa', 'ccpa', 'pci',
  'state machine', 'invariant',
]);

/**
 * @returns {{ escalate: boolean, reason: string }}
 */
export function shouldEscalate(finding) {
  if (!finding || typeof finding !== 'object') {
    return { escalate: false, reason: '' };
  }
  const dim = typeof finding.dimension === 'string' ? finding.dimension : '';
  if (ESCALATE_DIMENSIONS.has(dim)) {
    return { escalate: true, reason: `escalate_dimension:${dim}` };
  }
  const cat = typeof finding.category === 'string' ? finding.category.toLowerCase() : '';
  for (const prefix of ESCALATE_CATEGORY_PREFIXES) {
    if (cat.startsWith(prefix)) {
      return { escalate: true, reason: `escalate_category_prefix:${prefix}` };
    }
  }
  const blob = `${finding.description ?? ''} ${finding.evidence ?? ''}`.toLowerCase();
  for (const needle of ESCALATE_EVIDENCE_SUBSTRINGS) {
    if (blob.includes(needle)) {
      return { escalate: true, reason: `escalate_evidence:${needle}` };
    }
  }
  return { escalate: false, reason: '' };
}
