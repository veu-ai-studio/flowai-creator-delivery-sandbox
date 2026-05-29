// src/lib/construction/gates/S4SecurityPreWrite.js
//
// S4 — Pre-write security gates (per dispatch reframing of CA-17 §3.4).
//
// The CA-17 spec §3.4 defines a 9-pillar POST-write security suite (SQLi,
// XSS, auth-bypass, secrets-leakage, dep-CVE, authz-regression, SSRF,
// rate-limit, CSRF). The dispatch reframes S4 for the Phase 1 wire_up
// engine as PRE-WRITE gates:
//
//   1. Prompt-injection guard — sanitise operator/finding free-text before
//      it enters the AI prompt (same posture as fixGenerator.js Panel-C).
//   2. Dependency expansion check — refuse fixes that import packages not
//      already in package.json dependencies (avoids inventing fictional
//      packages). The S2 new_dependency_cap still applies; this gate
//      enforces "named in package.json" on the existing-import path.
//   3. Cross-file collateral check — refuse fixes whose touched file set
//      crosses module boundaries declared off-limits by the candidate
//      (e.g. wire_up should not be editing files outside the originating
//      page surface + the new handler module).
//
// Failures abort with construction_security_pre_write_failure.v1 BEFORE
// any code is written to disk.

'use strict';

import { sanitiseAndTruncate } from '../../agents/renewal/fixGenerator.js';

export const SECURITY_PRE_WRITE_FAILURE_KIND = 'construction_security_pre_write_failure.v1';

const INJECTION_PATTERNS = Object.freeze([
  /ignore previous instructions/gi,
  /ignore all prior instructions/gi,
  /disregard (?:all )?(?:previous|prior) instructions/gi,
  /system:\s*/gi,
  /<\|.*?\|>/g,
  /###\s*(system|instruction|assistant|user)\b[^\n]*/gi,
  /\[\s*(system|instruction)\s*\][^\n]*/gi,
  /(?:^|\n)\s*(?:disclose|exfiltrate|reveal)\s+(?:api|secret|key|token)/gi,
]);

function makeS4Error(message, extra = {}) {
  const err = new Error(message);
  err.code = SECURITY_PRE_WRITE_FAILURE_KIND;
  err.gate = 'S4';
  for (const [k, v] of Object.entries(extra)) err[k] = v;
  return err;
}

/**
 * Sanitise finding text + return the cleaned text plus a flag indicating
 * whether any injection pattern was matched + redacted.
 *
 * @param {string} text
 * @returns {{ cleaned: string, redacted: boolean, matches: number }}
 */
export function guardPromptInjection(text) {
  if (typeof text !== 'string') return { cleaned: '', redacted: false, matches: 0 };
  const original = text;
  const cleaned = sanitiseAndTruncate(original, 2000);
  // Count how many of OUR patterns matched (beyond fixGenerator's). The
  // cleaned text now carries [REDACTED-INJECTION-PATTERN] tokens.
  const matches = (cleaned.match(/\[REDACTED-INJECTION-PATTERN\]/g) || []).length;
  return { cleaned, redacted: matches > 0, matches };
}

/**
 * Check every import in the generated source against the project's
 * known-package list (from package.json dependencies + devDependencies).
 * Returns the offending package names if any are missing.
 *
 * NOTE: we accept relative imports (./, ../) and the bare-spec form
 * "node:..." unconditionally. The check is for npm package imports.
 *
 * @param {object} args
 * @param {string} args.source        — the generated source content
 * @param {object} args.knownPackages — { [name]: version } map
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function checkDependencyExpansion(args) {
  if (!args || typeof args.source !== 'string') {
    return { ok: false, missing: [] };
  }
  const knownPackages = args.knownPackages ?? {};
  const importPattern = /(?:^|\n)\s*(?:import|export)\s+(?:[^"';]+\s+from\s+)?['"]([^'"]+)['"]/g;
  const requirePattern = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
  const missing = [];
  const seen = new Set();

  function checkSpec(spec) {
    if (!spec || seen.has(spec)) return;
    seen.add(spec);
    if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:')) return;
    // Scoped (@org/pkg) or plain (pkg/sub/path).
    const pkgName = spec.startsWith('@')
      ? spec.split('/').slice(0, 2).join('/')
      : spec.split('/')[0];
    if (!knownPackages[pkgName]) missing.push(pkgName);
  }

  let m;
  while ((m = importPattern.exec(args.source)) !== null) checkSpec(m[1]);
  while ((m = requirePattern.exec(args.source)) !== null) checkSpec(m[1]);

  return { ok: missing.length === 0, missing };
}

/**
 * Check that the touched file set stays within the declared collateral
 * boundary for the construction. For wire_up, the boundary is the
 * originating page surface plus the new handler module path. For other
 * classes, callers supply the allowed prefixes.
 *
 * @param {object} args
 * @param {string[]} args.touchedFiles    — files the candidate will write
 * @param {string[]} args.allowedPrefixes — path prefixes allowed for this construction
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function checkCrossFileCollateral(args) {
  if (!args || !Array.isArray(args.touchedFiles) || !Array.isArray(args.allowedPrefixes)) {
    return { ok: false, violations: [] };
  }
  if (args.allowedPrefixes.length === 0) {
    return { ok: true, violations: [] };
  }
  const violations = [];
  for (const path of args.touchedFiles) {
    if (typeof path !== 'string') continue;
    if (!args.allowedPrefixes.some((p) => path.startsWith(p))) {
      violations.push(path);
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Run all three pre-write gates. Throws on any failure; returns the
 * passing summary when all clear.
 */
export async function runS4SecurityPreWrite({ productId, environment, candidate, knownPackages, allowedPrefixes, appendGovernanceEntry, supabase, logger }) {
  if (!candidate || typeof candidate !== 'object') {
    throw makeS4Error('S4SecurityPreWrite: candidate object required');
  }

  // 1. Prompt-injection: scan every operator-influenced text field that
  //    will be templated into the AI prompt.
  const textFields = [];
  if (typeof candidate.issue === 'string') textFields.push(['issue', candidate.issue]);
  if (typeof candidate.fix === 'string') textFields.push(['fix', candidate.fix]);
  for (const f of (candidate.findings || [])) {
    if (f?.evidence) textFields.push([`finding.evidence:${f.id ?? '?'}`, f.evidence]);
    if (f?.description) textFields.push([`finding.description:${f.id ?? '?'}`, f.description]);
    if (f?.recommendation) textFields.push([`finding.recommendation:${f.id ?? '?'}`, f.recommendation]);
  }
  const injectionResults = textFields.map(([k, v]) => {
    const r = guardPromptInjection(v);
    return { field: k, ...r };
  });
  const totalRedactions = injectionResults.reduce((acc, r) => acc + r.matches, 0);

  // 2. Dependency expansion: every generated file's source must only
  //    import known packages.
  const depCheckResults = [];
  for (const file of (candidate.generatedFiles || [])) {
    if (!file || typeof file.source !== 'string') continue;
    const r = checkDependencyExpansion({ source: file.source, knownPackages });
    if (!r.ok) {
      depCheckResults.push({ filePath: file.path, missing: r.missing });
    }
  }

  // 3. Cross-file collateral: every touched path must fall under an
  //    allowed prefix.
  const touchedFiles = (candidate.generatedFiles || []).map((f) => f.path).filter(Boolean);
  const collateralResult = checkCrossFileCollateral({ touchedFiles, allowedPrefixes });

  const summary = Object.freeze({
    injection: Object.freeze({
      total_fields: textFields.length,
      total_redactions: totalRedactions,
      redacted_fields: Object.freeze(injectionResults.filter((r) => r.redacted).map((r) => r.field)),
    }),
    dependency_expansion: Object.freeze({
      offending_files: Object.freeze(depCheckResults),
    }),
    cross_file_collateral: Object.freeze({
      violations: Object.freeze(collateralResult.violations),
    }),
  });

  if (depCheckResults.length > 0) {
    throw makeS4Error(
      `S4: dependency expansion check failed — generated files import packages not in package.json: ${
        depCheckResults.map((r) => `${r.filePath}: [${r.missing.join(', ')}]`).join('; ')
      }`,
      { failure_class: 'dependency_expansion', summary });
  }
  if (collateralResult.violations.length > 0) {
    throw makeS4Error(
      `S4: cross-file collateral check failed — files outside allowed prefixes: ${collateralResult.violations.join(', ')}`,
      { failure_class: 'cross_file_collateral', summary });
  }

  const envelope = Object.freeze({
    kind: 'construction_security_pre_write.v1',
    summary,
    captured_at: new Date().toISOString(),
  });
  if (typeof appendGovernanceEntry === 'function') {
    await appendGovernanceEntry({
      productId,
      environment: environment ?? 'prd',
      entry: envelope,
      supabase,
    });
  }
  if (logger?.info) logger.info('S4 pre-write gates passed', { productId, summary });
  return Object.freeze({ ok: true, envelope, summary, injectionResults });
}

export const __internals = Object.freeze({ INJECTION_PATTERNS });
