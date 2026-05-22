// src/lib/fixReview/checks/rootCause.js
//
// Q8: Is this issue symptomatic, not root-cause? (false-fix risk)
//
// Signal: shapes in the added lines that frequently mask a bug
// instead of fixing it. These don't prove the fix is wrong — they
// prove a reviewer should ask "is this the root cause?" out loud.
//
// Detected patterns:
//   - empty catch blocks                   ( "swallow the error" )
//   - try/catch with only console.error     ( "log and pretend OK" )
//   - new default values that hide null     ( `?? 0` on a stat, etc.)
//   - timeouts / sleeps inserted near the failure
//   - retry loops without backoff
//   - feature flag set to FALSE to "fix" a bug
//   - if-guard added around the failing line ( "skip when undefined" )
//
// Heuristic — produces WARN when triggered. The signal is "is this a
// real fix, or a band-aid?"

'use strict';

const SYMPTOM_PATTERNS = Object.freeze([
  { tag: 'empty-catch',           re: /catch\s*\([^)]*\)\s*\{\s*\}/ },
  { tag: 'catch-only-log',        re: /catch\s*\([^)]*\)\s*\{\s*console\.(log|warn|error)[^}]*\}\s*(?!;|catch|finally)/ },
  { tag: 'catch-swallow-comment', re: /\/\*\s*(swallow|ignore|silent)\s*\*\/|\/\/\s*(swallow|ignore|silent)/i },
  { tag: 'inserted-sleep',        re: /(setTimeout|sleep|delay)\s*\(\s*\d{2,}\s*[,)]/ },
  { tag: 'retry-no-backoff',      re: /while\s*\(\s*true\s*\)\s*\{[^}]*retry/i },
  { tag: 'flag-flipped-off',      re: /(enabled|active|featureFlag)\s*[:=]\s*false/ },
  { tag: 'null-coalesce-mask',    re: /\?\?\s*(0|''|"")\s*[;,)\]}]/ },
  { tag: 'optional-chain-guard',  re: /\.\?\.[a-zA-Z_$][\w$]*\s*\?\?/ },
]);

const ROOT_CAUSE_INDICATORS = Object.freeze([
  'root cause',
  'why this happens',
  'underlying',
  'because',
  'reason:',
  'fixes #',
]);

function commentMentionsRootCause(text) {
  if (typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  return ROOT_CAUSE_INDICATORS.some((token) => lower.includes(token));
}

export function checkRootCause({ diff }) {
  const files = Array.isArray(diff?.files) ? diff.files : [];
  if (files.length === 0) return { verdict: 'pass', evidence: ['no_files_changed'] };

  const evidence = [];
  let symptomHits = 0;

  for (const f of files) {
    const added = Array.isArray(f.addedLines) ? f.addedLines.join('\n') : '';
    for (const { tag, re } of SYMPTOM_PATTERNS) {
      if (re.test(added)) {
        evidence.push(`${f.path}: symptomatic pattern '${tag}'`);
        symptomHits += 1;
      }
    }
  }

  if (symptomHits === 0) {
    return { verdict: 'pass', evidence: ['no_symptomatic_patterns'] };
  }

  // Mitigating signal — if any changed file's added lines explain WHY
  // (a "root cause" or "because" comment / docstring), downgrade the
  // verdict from warn to pass-with-evidence.
  let explained = false;
  for (const f of files) {
    const added = Array.isArray(f.addedLines) ? f.addedLines.join('\n') : '';
    if (commentMentionsRootCause(added)) { explained = true; break; }
  }
  if (explained) {
    return {
      verdict: 'warn',
      evidence: [...evidence, 'mitigation: change includes a root-cause comment'],
      suggestion: 'Symptomatic shapes found, but the diff comments the underlying cause. Spot-check that the comment matches reality.',
    };
  }
  return {
    verdict: 'warn',
    evidence,
    suggestion: 'Several "band-aid" shapes detected and no comment explains WHY the fix works. Ask: what is the underlying defect? Could it surface elsewhere?',
  };
}

export const __internals = Object.freeze({ SYMPTOM_PATTERNS, ROOT_CAUSE_INDICATORS, commentMentionsRootCause });
