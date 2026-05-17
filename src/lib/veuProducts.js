// VEU portfolio product config — client-side metadata only.
//
// Long-form synthetic-data prompts are NOT stored here per W0 IP-hygiene
// ruling; they are loaded at runtime via src/lib/syntheticPromptLoader.js
// from a non-public source (env vars / Supabase row / secret manager).

export const VEU_PRODUCTS = [
  {
    name: 'SAIGE',
    url: 'https://saigeplatform.com',
    tagline: 'AI-powered sustainability intelligence for universities',
    audience: 'university sustainability directors',
    audience_short: 'Sustainability Directors',
    demo_org: 'Lakewood University',
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    dot: 'bg-emerald-400',
  },
  {
    name: 'PressAI',
    url: 'https://ourpublishingai.com',
    tagline: 'AI publishing platform for authors and publishers',
    audience: 'authors, publishers, and content creators',
    audience_short: 'Publishers',
    demo_org: 'Meridian Press',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    dot: 'bg-blue-400',
  },
  {
    name: 'ReachSMS',
    url: '',
    tagline: 'SMS community engagement for nonprofits',
    audience: 'nonprofits and community organizations',
    audience_short: 'Community Managers',
    demo_org: 'Bridges Community Network',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/5',
    dot: 'bg-purple-400',
  },
  {
    name: 'RelTwin',
    url: 'https://reltwin.com',
    tagline: 'Relationship intelligence for coaches and HR professionals',
    audience: 'coaches and HR professionals',
    audience_short: 'Executive Coaches',
    demo_org: 'Apex Leadership Partners',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    dot: 'bg-amber-400',
  },
  {
    name: 'MyPregLife',
    url: '',
    tagline: 'Personalized maternal health tracking for Africa',
    audience: 'pregnant women in Nigeria and Africa',
    audience_short: 'Healthcare Workers',
    demo_org: 'MyPregLife Cohort',
    color: 'text-rose-400',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5',
    dot: 'bg-rose-400',
  },
];
