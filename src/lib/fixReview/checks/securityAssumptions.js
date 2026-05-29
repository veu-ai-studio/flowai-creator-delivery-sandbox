// src/lib/fixReview/checks/securityAssumptions.js
//
// Q6: Does this alter security assumptions? (vulnerability risk)
//
// Signal: the diff touches a security-sensitive path or contains
// shapes that frequently widen the attack surface — auth handlers,
// secret retrieval, SQL/RLS, CORS, cookie config, redirect targets,
// crypto primitives, or unsafe HTML.
//
// Detection is intentionally NOISY (fires WARN often) because the
// review's role is to surface attention, not to gate.

'use strict';

const SECURITY_PATH_PREFIXES = Object.freeze([
  'api/auth/',
  'src/api/auth/',
  'src/lib/security/',
  'src/lib/agents/auth/',
  'supabase/migrations/',
  'src/components/RequireAuth',
  'src/lib/AuthContext',
  'src/lib/governance/',
]);

const ADD_LINE_PATTERNS = Object.freeze([
  { tag: 'cors-wildcard',           re: /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*/ },
  { tag: 'dangerouslySetInnerHTML', re: /dangerouslySetInnerHTML/ },
  { tag: 'eval-or-new-function',    re: /\beval\s*\(|new\s+Function\s*\(/ },
  { tag: 'http-redirect',           re: /Location['"]?\s*[:,]\s*['"]http:\/\// },
  { tag: 'process-env-secret',      re: /process\.env\.(SECRET|TOKEN|KEY|PASSWORD)[A-Z0-9_]*/ },
  { tag: 'cookie-no-httponly',      re: /Set-Cookie[^"\n]*=[^"\n]*(?!httpOnly)/i },
  { tag: 'jwt-decode-no-verify',    re: /jwt\.decode\s*\(/ },
  { tag: 'sql-template-string',     re: /\bsql`[^`]*\$\{[^}]+\}/ },
  { tag: 'crypto-weak',             re: /createHash\s*\(\s*['"](md5|sha1)['"]\s*\)/ },
  { tag: 'rls-bypass',              re: /\bservice_role|SUPABASE_SERVICE_ROLE_KEY/ },
]);

function isSecurityPath(path) {
  if (typeof path !== 'string') return false;
  return SECURITY_PATH_PREFIXES.some((p) => path.startsWith(p));
}

export function checkSecurityAssumptions({ diff }) {
  const files = Array.isArray(diff?.files) ? diff.files : [];
  if (files.length === 0) return { verdict: 'pass', evidence: ['no_files_changed'] };

  const evidence = [];
  let worst = 'pass';
  const bump = (v) => {
    if (v === 'fail') worst = 'fail';
    else if (v === 'warn' && worst !== 'fail') worst = 'warn';
  };

  for (const f of files) {
    if (isSecurityPath(f.path)) {
      evidence.push(`${f.path}: touches security-sensitive path`);
      bump('warn');
    }
    const added = Array.isArray(f.addedLines) ? f.addedLines.join('\n') : '';
    for (const { tag, re } of ADD_LINE_PATTERNS) {
      if (re.test(added)) {
        evidence.push(`${f.path}: pattern '${tag}' in added lines`);
        // dangerouslySetInnerHTML + eval + cors-wildcard are FAIL signals.
        if (tag === 'eval-or-new-function' || tag === 'dangerouslySetInnerHTML'
         || tag === 'cors-wildcard' || tag === 'crypto-weak') bump('fail');
        else bump('warn');
      }
    }
  }

  if (evidence.length === 0) {
    return { verdict: 'pass', evidence: ['no_security_signals_detected'] };
  }
  return {
    verdict: worst,
    evidence,
    suggestion: 'Security-adjacent change — confirm the threat model. Any FAIL above is a hard reject unless paired with a written mitigation.',
  };
}

export const __internals = Object.freeze({ isSecurityPath, SECURITY_PATH_PREFIXES, ADD_LINE_PATTERNS });
