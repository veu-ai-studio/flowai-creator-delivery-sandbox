// Per-product domain config — single source of truth for which domain each
// VEU product currently lives at, which legacy domains exist, and where each
// product is migrating to under the four-tier demo standard.
//
// Updating product domains: change one entry here. configRegistry.js,
// admin/seed.js, and the orchestrator all read from this. Never hardcode
// a product domain elsewhere.
//
// Schema per product:
//   {
//     slug: 'saige',
//     name: 'SAIGE',
//     description: '...',
//     tags: ['...'],
//     status: 'active' | 'draft' | 'archived',
//
//     // Canonical URL the product is reachable at TODAY
//     live_url: string,
//
//     // Legacy domains slated for retirement via 301 at migration cutover.
//     // Each entry: { domain: 'saigedemo.com', target_path: '/live-demo',
//     //              status: 'active'|'redirected'|'retired' }
//     legacy_domains: [...],
//
//     // The planned future canonical URL under the four-tier standard
//     // (live + waitlist + audited demo + investor demo on the same root).
//     // Empty string when no migration is planned.
//     target_url: string,
//
//     // Per-product objectives that flow into audit prompts.
//     objectives: [...],
//   }

export const ORG = {
  id: 'veu-ai-studio',
  clerk_org_id: null,                  // tomorrow Clerk assigns canonical id
  name: 'VEU AI Studio',
  slug: 'veu-ai-studio',
  plan: 'free',
};

// ─── VEU portfolio canonical config ────────────────────────────────────

export const VEU_PRODUCTS = [
  {
    slug: 'saige',
    name: 'SAIGE',
    description: 'Sustainability + ESG + EHS + CSR enterprise impact platform',
    type: 'web',
    status: 'active',
    tags: ['sustainability', 'esg', 'ehs'],
    live_url: 'https://saigedemo.com',
    target_url: 'https://saigeplatform.com',
    legacy_domains: [
      {
        domain: 'saigedemo.com',
        target_path: '/live-demo',
        status: 'redirected',            // W4 Phase 4b cutover landed; saigedemo.com 301 → saigeplatform.com/live-demo
        notes: 'Pre-dates the four-tier demo standard. Contained the SAIGE waitlist + animated EIP scoring widget. As of W4 Phase 4b cutover, 301-redirected to saigeplatform.com/live-demo.',
      },
    ],
    objectives: [
      { type: 'goal', value: 'Capture early-access registrations from sustainability/EHS leaders', weight: 1 },
      { type: 'preference', value: 'Audit lens: investor_review and full_governance', weight: 1 },
    ],
  },
  {
    slug: 'pressai',
    name: 'PressAI',
    description: 'AI publishing platform for authors and publishers',
    type: 'web',
    status: 'active',
    tags: ['publishing', 'agentic'],
    live_url: 'https://ourpublishingai.com',
    target_url: '',                      // TODO Victor: keep as primary or migrate to a new domain
    legacy_domains: [],                  // no known legacy domains today
    objectives: [
      { type: 'goal', value: 'Drive free sign-ups and convert to Creator/Professional/Enterprise tiers', weight: 1 },
      { type: 'constraint', value: 'AI disclosure required (EU AI Act, US state laws)', weight: 1 },
    ],
  },
  {
    slug: 'reachsms',
    name: 'ReachSMS',
    description: 'SMS community engagement for nonprofits',
    type: 'web',
    status: 'draft',                     // demoted until URL confirmed
    tags: ['sms', 'nonprofit'],
    live_url: '',                        // TODO Victor — domain unknown
    target_url: '',
    legacy_domains: [],
    objectives: [
      { type: 'preference', value: 'Audit lens: nonprofit GTM, mobile-first', weight: 1 },
    ],
  },
  {
    slug: 'reltwin',
    name: 'RelTwin',
    description: 'Relationship intelligence for coaches and HR',
    type: 'web',
    status: 'draft',                     // demoted until URL confirmed
    tags: ['hr', 'coaching'],
    live_url: '',                        // TODO Victor — canonical URL TBD
    target_url: '',
    legacy_domains: [],
    objectives: [
      { type: 'preference', value: 'Audit lens: B2B SaaS, privacy-first', weight: 1 },
    ],
  },
  {
    slug: 'mybirthsafe',
    name: 'MyBirthSafe',
    description: 'Maternal health platform for Africa',
    type: 'web',
    status: 'active',
    tags: ['health', 'maternal', 'africa'],
    live_url: '',                        // canonical domain TBD; prior staging URL scrubbed per W4 IP-hygiene Tier 1.b
    target_url: '',
    legacy_domains: [],
    objectives: [
      { type: 'constraint', value: 'PII / health-data compliance (HIPAA-equivalent jurisdictional rules)', weight: 2 },
      { type: 'preference', value: 'Audit lens: full_governance', weight: 1 },
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

const BY_SLUG = Object.fromEntries(VEU_PRODUCTS.map((p) => [p.slug, p]));

export function getProductDomainConfig(slug) {
  return BY_SLUG[slug] || null;
}

export function getCurrentLiveUrl(slug) {
  const p = BY_SLUG[slug];
  return p?.live_url || null;
}

export function getTargetUrl(slug) {
  const p = BY_SLUG[slug];
  return p?.target_url || null;
}

export function getLegacyDomains(slug) {
  const p = BY_SLUG[slug];
  return p?.legacy_domains || [];
}

// Resolve a host (like 'saigedemo.com') back to the product slug + the
// redirect target path, if any. Used by tooling that monitors legacy 404s
// or generates the redirect rule for hosting providers.
export function resolveLegacyDomain(host) {
  const normalised = (host || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  for (const p of VEU_PRODUCTS) {
    for (const legacy of (p.legacy_domains || [])) {
      if (legacy.domain === normalised) {
        return {
          slug: p.slug,
          name: p.name,
          legacy_domain: legacy.domain,
          target_url: p.target_url,
          target_path: legacy.target_path || '/',
          full_target: `${p.target_url}${legacy.target_path || '/'}`,
          status: legacy.status,
          notes: legacy.notes,
        };
      }
    }
  }
  return null;
}

// All currently-active legacy redirects, for a tooling/reporting endpoint.
export function listActiveLegacyRedirects() {
  const out = [];
  for (const p of VEU_PRODUCTS) {
    for (const legacy of (p.legacy_domains || [])) {
      if (legacy.status === 'active' || legacy.status === 'redirected') {
        out.push({
          product_slug: p.slug,
          product_name: p.name,
          legacy_domain: legacy.domain,
          target_url: p.target_url,
          target_path: legacy.target_path || '/',
          full_target: `${p.target_url}${legacy.target_path || '/'}`,
          status: legacy.status,
        });
      }
    }
  }
  return out;
}

// Convenience: yields the seed shape consumed by configRegistry + admin/seed.
// Adds a default org_id so callers don't need to inject it.
export function veuSeed({ orgId = ORG.id } = {}) {
  return VEU_PRODUCTS.map((p) => ({
    name: p.name,
    slug: p.slug,
    live_url: p.live_url,
    description: p.description,
    type: p.type,
    status: p.status,
    tags: p.tags,
    objectives: p.objectives || [],
    org_id: orgId,
    // Pass-through for callers that want migration metadata
    target_url: p.target_url,
    legacy_domains: p.legacy_domains,
  }));
}
