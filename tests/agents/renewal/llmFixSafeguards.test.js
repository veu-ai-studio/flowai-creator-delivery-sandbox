import { describe, expect, it } from 'vitest';
import {
  LLM_FIX_BUDGET_EXCEEDED,
  LLM_FIX_FEATURE_DISABLED,
  containsSecretLikeText,
  enforceLlmFixBudget,
  extractBareImports,
  isForbiddenLlmSourcePath,
  llmFixesEnabled,
  shouldUseDeterministicRepairFirst,
  summarizeLlmAttempt,
  validateLlmFixCandidate,
} from '../../../src/lib/agents/renewal/llmFixSafeguards.js';

describe('llmFixSafeguards', () => {
  it('keeps LLM fixes gated off by default', () => {
    expect(llmFixesEnabled({})).toBe(false);
    expect(llmFixesEnabled({ FLOWAI_ENABLE_LLM_FIXES: 'false' })).toBe(false);
    expect(llmFixesEnabled({ FLOWAI_ENABLE_LLM_FIXES: 'true' })).toBe(true);
    expect(LLM_FIX_FEATURE_DISABLED).toBe('LLM_FIX_FEATURE_DISABLED');
  });

  it('routes deterministic categories before LLM repair', () => {
    expect(shouldUseDeterministicRepairFirst({ category: 'alt-text' })).toBe(true);
    expect(shouldUseDeterministicRepairFirst({ title: 'Broken-link on footer' })).toBe(true);
    expect(shouldUseDeterministicRepairFirst({ category: 'business-flow' })).toBe(false);
  });

  it('blocks universal mode from source patches', () => {
    const result = validateLlmFixCandidate({
      universalMode: true,
      filePath: 'src/App.jsx',
      allowedFiles: ['src/App.jsx'],
      candidate: { rationale: 'Improves flow.', confidence: 90 },
      replacementContent: 'export default function App(){ return null; }',
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('UNIVERSAL_MODE_SOURCE_PATCH_BLOCKED');
  });

  it('rejects forbidden platform paths', () => {
    expect(isForbiddenLlmSourcePath('src/api/base44Client.js')).toBe(true);
    const result = validateLlmFixCandidate({
      filePath: 'src/api/base44Client.js',
      candidate: { rationale: 'Nope.', confidence: 90 },
      replacementContent: 'export const x = 1;',
    });
    expect(result.reason).toBe('PLATFORM_BOUNDARY_BLOCKED');
    expect(result.classification).toBe('PLATFORM_BOUNDARY_BLOCKED');
  });

  it('enforces allowedFiles', () => {
    const result = validateLlmFixCandidate({
      filePath: 'src/Invented.jsx',
      allowedFiles: ['src/App.jsx'],
      candidate: { rationale: 'Improves layout.', confidence: 90 },
      replacementContent: 'export default function Invented(){ return null; }',
    });
    expect(result.reason).toBe('FILE_NOT_IN_ALLOWED_FILES');
  });

  it('enforces budget caps', () => {
    const result = enforceLlmFixBudget({
      files: ['a', 'b', 'c', 'd', 'e', 'f'],
      findings: [],
      sourceChars: 10,
      iterationCalls: 1,
      runCalls: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(LLM_FIX_BUDGET_EXCEEDED);
    expect(result.cap).toBe('maxFilesPerCall');
  });

  it('marks low confidence as requiring human review', () => {
    const result = validateLlmFixCandidate({
      filePath: 'src/App.jsx',
      allowedFiles: ['src/App.jsx'],
      candidate: { rationale: 'May help.', confidence: 69 },
      replacementContent: 'export default function App(){ return null; }',
    });
    expect(result.ok).toBe(false);
    expect(result.requiresHumanReview).toBe(true);
  });

  it('rejects new dependencies without approval', () => {
    const result = validateLlmFixCandidate({
      filePath: 'src/App.jsx',
      allowedFiles: ['src/App.jsx'],
      existingPackageNames: new Set(['react']),
      originalContent: 'import React from "react";\nexport default function App(){ return null; }',
      replacementContent: 'import React from "react";\nimport confetti from "canvas-confetti";\nexport default function App(){ return confetti(); }',
      candidate: { rationale: 'Adds flourish.', confidence: 90 },
    });
    expect(result.reason).toBe('NEW_DEPENDENCY_REQUIRES_APPROVAL');
    expect(result.dependencies).toEqual(['canvas-confetti']);
  });

  it('rejects secret-like content', () => {
    expect(containsSecretLikeText('ANTHROPIC_API_KEY="sk-ant-12345678901234567890"')).toBe(true);
    const result = validateLlmFixCandidate({
      filePath: 'src/App.jsx',
      allowedFiles: ['src/App.jsx'],
      candidate: { rationale: 'Adds config.', confidence: 90 },
      replacementContent: 'export const token = "Bearer abcdefghijklmnopqrstuvwxyz";',
    });
    expect(result.reason).toBe('SECRET_LIKE_CONTENT_REJECTED');
  });

  it('extracts bare imports for dependency validation', () => {
    expect([...extractBareImports('import x from "@scope/pkg/sub"; const y = require("vite"); import("./local.js");')])
      .toEqual(['@scope/pkg', 'vite']);
  });

  it('governance summaries omit prompts and full source', () => {
    const summary = summarizeLlmAttempt({
      model: 'claude-sonnet-4-20250514',
      findingsSentCount: 2,
      filesSentCount: 1,
      sourceCharsSent: 1200,
      accepted: false,
      rejectionReason: 'MISSING_RATIONALE',
      filesChanged: [],
      validationResult: { ok: false, reason: 'MISSING_RATIONALE' },
    });
    expect(summary).toMatchObject({
      model: 'claude-sonnet-4-20250514',
      findingsSentCount: 2,
      accepted: false,
      rejectionReason: 'MISSING_RATIONALE',
    });
    expect(summary).not.toHaveProperty('prompt');
    expect(summary).not.toHaveProperty('source');
  });
});
