// ─── FLOWAI CONTENT PROTECTION — PHASE 1 ─────────────────────────────────────
// Installs right-click disable and DevTools detection
// Must be called once from AppLayout.
//
// PA #2.5a — Env Gate:
//   The two install*Protection() entry points consult
//   `isAntiTamperEnabled()` from /src/lib/security/anti-tamper-gate. When the
//   gate returns false (preview / development / unknown env), the installers
//   short-circuit to a noop and return a noop cleanup so DevTools, F12, and
//   right-click stay usable for development debugging.

import { isAntiTamperEnabled } from '@/lib/security/anti-tamper-gate';

// ── Right-click disable ──
// Allow Edge's built-in Web Capture (Ctrl+Shift+S) — detected via Edg/ in userAgent
const isEdge = typeof navigator !== 'undefined' && /Edg\//.test(navigator.userAgent);

export function installRightClickProtection() {
  // PA #2.5a — gate by environment. Preview / dev → noop.
  if (!isAntiTamperEnabled()) {
    return () => { /* gate off — noop cleanup */ };
  }
  const handler = (e) => {
    // Allow Edge Web Capture shortcut (Ctrl+Shift+S) — do not block
    if (isEdge && e.ctrlKey && e.shiftKey) return;
    e.preventDefault();
    showProtectionNotice();
    return false;
  };
  document.addEventListener('contextmenu', handler);
  return () => document.removeEventListener('contextmenu', handler);
}

function showProtectionNotice() {
  // Remove existing notice if any
  const existing = document.getElementById('flowai-protect-notice');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'flowai-protect-notice';
  el.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: #0e1521; border: 1px solid rgba(59,130,246,0.4);
    color: #94a3b8; font-size: 12px; font-family: Inter, sans-serif;
    padding: 10px 16px; border-radius: 8px; z-index: 99999;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    pointer-events: none;
  `;
  el.textContent = 'FlowAI is proprietary VEU AI Studio infrastructure.';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ── DevTools detection ──
let devToolsOpen = false;
export function installDevToolsDetection() {
  // PA #2.5a — gate by environment. Preview / dev → noop so F12 stays open.
  if (!isAntiTamperEnabled()) {
    return () => { /* gate off — noop cleanup */ };
  }
  const threshold = 160;
  const check = () => {
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;
    const opened = widthDiff || heightDiff;
    if (opened && !devToolsOpen) {
      devToolsOpen = true;
      logDevToolsEvent();
    } else if (!opened) {
      devToolsOpen = false;
    }
  };
  const interval = setInterval(check, 2000);
  return () => clearInterval(interval);
}

async function logDevToolsEvent() {
  console.warn('[content-protection] DevTools-open signal observed');
}

// ── Bot detection logging ──
export async function logBotDetection(signal) {
  console.warn('[content-protection] Bot signal observed:', String(signal));
}

// ── Anomaly detection ──
export function checkSessionAnomaly(sessionDurationMs, stepCount) {
  // Sessions completing all 8 steps in under 60 seconds
  if (stepCount >= 8 && sessionDurationMs < 60000) {
    return 'Session completed all 8 steps in under 60 seconds — possible automated gaming';
  }
  return null;
}

export function checkScoreAnomaly(previousScore, currentScore) {
  if (previousScore != null && currentScore - previousScore > 5) {
    return 'Score improved by more than 5 points without any fixes applied — possible prompt injection or gaming';
  }
  return null;
}

export function checkClearanceAnomaly(overallScore, decision) {
  if (decision === 'CLEARED' && overallScore < 40) {
    return 'CLEARED decision issued for product scoring below 40 overall — flagged for manual review';
  }
  return null;
}
