// src/lib/fixReview/checks/stateModel.js
//
// Q5: Is the state model affected? (hidden side effects)
//
// Signal: the diff modifies state-bearing surfaces — React state
// hooks, Context providers, Zustand/Redux stores, top-level let/var
// declarations, or persisted-state schemas. State changes have
// silent cross-cutting effects; the senior engineer wants to know
// the change is intentional, not incidental.

'use strict';

const STATE_BEARING_PATTERNS = Object.freeze([
  { tag: 'react-useState',     re: /\buseState\s*\(/ },
  { tag: 'react-useReducer',   re: /\buseReducer\s*\(/ },
  { tag: 'react-useContext',   re: /\buseContext\s*\(/ },
  { tag: 'context-provider',   re: /createContext\s*\(|\.Provider\b/ },
  { tag: 'zustand-store',      re: /\bcreate\(\s*\((set|get)/ },
  { tag: 'redux-reducer',      re: /case\s+['"][A-Z_]+['"]\s*:/ },
  { tag: 'top-level-let',      re: /^(?:let|var)\s+[a-zA-Z_$][\w$]*\s*=/m },
  { tag: 'storage-set',        re: /(localStorage|sessionStorage|indexedDB)\.(setItem|put|add)/ },
  { tag: 'module-mutation',    re: /\bexport\s+(?:let|var)\s+/ },
  { tag: 'state-schema-edit',  re: /supabase\.from\(['"][\w]+['"]\)\.(update|upsert|insert|delete)/ },
]);

const REMOVAL_PATTERNS = Object.freeze([
  { tag: 'react-useState-removed',  re: /\buseState\s*\(/ },
  { tag: 'react-useReducer-removed', re: /\buseReducer\s*\(/ },
]);

export function checkStateModel({ diff }) {
  const files = Array.isArray(diff?.files) ? diff.files : [];
  if (files.length === 0) return { verdict: 'pass', evidence: ['no_files_changed'] };

  const evidence = [];
  let touched = false;

  for (const f of files) {
    const added = Array.isArray(f.addedLines) ? f.addedLines.join('\n') : '';
    const removed = Array.isArray(f.removedLines) ? f.removedLines.join('\n') : '';
    for (const { tag, re } of STATE_BEARING_PATTERNS) {
      if (re.test(added)) {
        evidence.push(`${f.path}: added/touched ${tag}`);
        touched = true;
      }
    }
    for (const { tag, re } of REMOVAL_PATTERNS) {
      if (re.test(removed) && !re.test(added)) {
        evidence.push(`${f.path}: removed ${tag} (state slot eliminated)`);
        touched = true;
      }
    }
  }

  if (!touched) {
    return { verdict: 'pass', evidence: ['no_state_bearing_changes_detected'] };
  }
  return {
    verdict: 'warn',
    evidence,
    suggestion: 'State-bearing edit detected. Confirm: (a) no consumer reads the old shape; (b) persisted-state migrations cover the change; (c) re-render budget unchanged.',
  };
}

export const __internals = Object.freeze({ STATE_BEARING_PATTERNS, REMOVAL_PATTERNS });
