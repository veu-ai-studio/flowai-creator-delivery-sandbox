// W3 overnight: marketplace inventory inspection.
// Parses src/lib/toolRegistry.js (the de-facto marketplace registry, since
// src/lib/marketplace/ does not exist) and reports counts, category coverage,
// and any tools referenced from VEU_STACKS that are missing from TOOL_REGISTRY
// (treated as "vendor pending / expected-missing" entries).

import { describe, it, expect } from 'vitest';
import {
  TOOL_REGISTRY,
  CATEGORIES,
  VEU_STACKS,
} from '../src/lib/toolRegistry.js';

describe('Marketplace inventory (toolRegistry.js)', () => {
  it('TOOL_REGISTRY is a non-empty array', () => {
    expect(Array.isArray(TOOL_REGISTRY)).toBe(true);
    expect(TOOL_REGISTRY.length).toBeGreaterThan(0);
  });

  it('every tool has the required fields', () => {
    const required = [
      'name', 'category', 'description', 'performance_score',
      'cost_tier', 'underserved_accessible', 'base44_compatible',
      'production_compatible', 'official_url', 'tags',
    ];
    for (const tool of TOOL_REGISTRY) {
      for (const field of required) {
        expect(tool, `tool=${tool.name}`).toHaveProperty(field);
      }
    }
  });

  it('reports total tool count', () => {
    expect(TOOL_REGISTRY.length).toBe(61);
  });

  it('reports categories', () => {
    const seen = new Set(TOOL_REGISTRY.map(t => t.category));
    const real = CATEGORIES.filter(c => c !== 'All');
    for (const cat of real) {
      expect(seen.has(cat), `category ${cat} has at least one tool`).toBe(true);
    }
  });

  it('reports per-category counts', () => {
    const counts = {};
    for (const t of TOOL_REGISTRY) counts[t.category] = (counts[t.category] || 0) + 1;
    expect(counts).toEqual({
      Research: 5,
      Design: 5,
      Build: 5,
      Database: 5,
      Authentication: 5,
      Deployment: 5,
      Payments: 5,
      SMS: 5,
      'AI/LLM': 5,
      Testing: 5,
      Monitoring: 5,
      Email: 5,
      Governance: 1,
    });
  });

  it('flags VEU_STACKS tools not present in TOOL_REGISTRY (vendor pending / expected-missing)', () => {
    const known = new Set(TOOL_REGISTRY.map(t => t.name));
    const missing = [];
    for (const [stack, byCategory] of Object.entries(VEU_STACKS)) {
      for (const [category, tools] of Object.entries(byCategory)) {
        for (const tool of tools) {
          if (!known.has(tool)) missing.push({ stack, category, tool });
        }
      }
    }
    expect(missing).toEqual([
      { stack: 'SAIGE', category: 'AI/LLM', tool: 'NeuralMax Pro' },
    ]);
  });

  it('has no explicit vendor_pending / status field on any tool (none use that schema today)', () => {
    const flagged = TOOL_REGISTRY.filter(
      t => t.vendor_pending === true || t.status === 'pending' || t.status === 'expected' || t.status === 'missing'
    );
    expect(flagged).toEqual([]);
  });
});
