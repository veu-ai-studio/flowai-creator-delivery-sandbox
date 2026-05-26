import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isFreshBuildEnabled } from '../../src/lib/freshBuild/constants.js';
import { extractFeatures } from '../../src/lib/freshBuild/featureExtractor.js';
import {
  AUTH_REQUIRED,
  REQUIRED_FEATURE_INVENTORY_FIELDS,
  UNKNOWN,
  validateFeatureInventory,
} from '../../src/lib/freshBuild/types/featureInventory.js';

const repoFile = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('freshBuild Feature Extractor scaffold', () => {
  it('defaults the Fresh Build feature flag to false', () => {
    expect(isFreshBuildEnabled({})).toBe(false);
    expect(isFreshBuildEnabled({ FLOWAI_ENABLE_FRESH_BUILD: 'false' })).toBe(false);
    expect(isFreshBuildEnabled({ FLOWAI_ENABLE_FRESH_BUILD: 'true' })).toBe(true);
  });

  it('returns a valid FeatureInventory shape without live crawling', () => {
    const inventory = extractFeatures('https://example.com', { now: '2026-05-26T00:00:00.000Z' });

    expect(inventory.url).toBe('https://example.com');
    expect(validateFeatureInventory(inventory)).toEqual({ ok: true, errors: [] });
    expect(inventory.metadata).toMatchObject({
      url: 'https://example.com',
      totalPagesDiscovered: 0,
      totalComponentsIdentified: 0,
      totalUserFlowsMapped: 0,
      crawlTimestamp: '2026-05-26T00:00:00.000Z',
      confidence: 0,
    });
  });

  it('includes every required top-level field', () => {
    const inventory = extractFeatures('https://example.com');
    for (const field of REQUIRED_FEATURE_INVENTORY_FIELDS) {
      expect(inventory).toHaveProperty(field);
    }
  });

  it('fails validation when required fields are missing', () => {
    const inventory = extractFeatures('https://example.com');
    delete inventory.components;

    const validation = validateFeatureInventory(inventory);
    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain('Missing required field: components');
  });

  it('accepts UNKNOWN placeholders instead of fabricated values', () => {
    const inventory = extractFeatures('https://example.com');
    inventory.pages[0].title = UNKNOWN;
    inventory.content.toneAndStyle.summary = UNKNOWN;
    inventory.businessRules.pricing.summary = UNKNOWN;

    expect(validateFeatureInventory(inventory).ok).toBe(true);
    expect(JSON.stringify(inventory)).toContain(UNKNOWN);
  });

  it('accepts AUTH_REQUIRED placeholders for auth-gated pages', () => {
    const inventory = extractFeatures('https://example.com');
    const authPage = inventory.pages.find((page) => page.access === AUTH_REQUIRED);

    expect(authPage).toMatchObject({
      purpose: AUTH_REQUIRED,
      primaryContent: AUTH_REQUIRED,
      access: AUTH_REQUIRED,
    });
    expect(validateFeatureInventory(inventory).ok).toBe(true);
  });

  it('rejects confidence scores outside 0-1', () => {
    const inventory = extractFeatures('https://example.com');
    inventory.metadata.confidence = 1.1;

    const validation = validateFeatureInventory(inventory);
    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain('Invalid confidence score: 1.1');
  });

  it('does not import platform SDKs or live browser automation', () => {
    const files = [
      'src/lib/freshBuild/constants.js',
      'src/lib/freshBuild/featureExtractor.js',
      'src/lib/freshBuild/types/featureInventory.js',
    ].map(repoFile).join('\n');

    expect(files).not.toMatch(/@base44\/sdk|base44Client|Browserless|Playwright|playwright|multiPageCrawler/i);
    expect(files).not.toMatch(/fetch\(|new WebSocket|chromium\.launch/i);
  });
});
