export const BUILD_TOOL_ORDER = Object.freeze([
  'Codex',
  'Claude Code',
  'Cursor',
  'Bolt',
  'Windsurf',
  'Replit',
  'Base44',
]);

const BUILD_TOOL_ORDER_BY_KEY = Object.freeze(Object.fromEntries(
  BUILD_TOOL_ORDER.map((name, index) => [normalizeBuildToolName(name), index + 1]),
));

export const BUILD_TOOL_RANKING_ROWS = Object.freeze([
  {
    step_name: 'build',
    rank: 1,
    platform_name: 'Codex',
    platform_type: 'code',
    performance_score: 10,
    cost_score: 7,
    speed_score: 9.5,
    reliability_score: 9.5,
    target_classes: Object.freeze(['web', 'native_app', 'mobile_app', 'SaaS', 'agentic_ai', 'generic_url']),
    notes: 'OpenAI-backed code patch and generate-from-scratch adapter; callable only with OPENAI_API_KEY.',
  },
  {
    step_name: 'build',
    rank: 2,
    platform_name: 'Claude Code',
    platform_type: 'code',
    performance_score: 9.8,
    cost_score: 7,
    speed_score: 9,
    reliability_score: 9,
    target_classes: Object.freeze(['web', 'native_app', 'mobile_app', 'SaaS', 'agentic_ai', 'generic_url']),
    notes: 'Anthropic-backed code patch and generation adapter; callable only with ANTHROPIC_API_KEY.',
  },
  {
    step_name: 'build',
    rank: 3,
    platform_name: 'Cursor',
    platform_type: 'code',
    performance_score: 9,
    cost_score: 8,
    speed_score: 9,
    reliability_score: 9,
    target_classes: Object.freeze(['web', 'native_app', 'mobile_app', 'SaaS', 'agentic_ai', 'generic_url']),
    notes: 'Ranked marketplace tool; adapter remains stubbed until a real callable API is admitted.',
  },
  {
    step_name: 'build',
    rank: 4,
    platform_name: 'Bolt',
    platform_type: 'ai_fullstack',
    performance_score: 8.7,
    cost_score: 8,
    speed_score: 9,
    reliability_score: 8,
    target_classes: Object.freeze(['web', 'SaaS', 'generic_url']),
    notes: 'Ranked marketplace tool; adapter remains unavailable for direct dispatch.',
  },
  {
    step_name: 'build',
    rank: 5,
    platform_name: 'Windsurf',
    platform_type: 'code',
    performance_score: 8.5,
    cost_score: 8,
    speed_score: 8,
    reliability_score: 8,
    target_classes: Object.freeze(['web', 'native_app', 'mobile_app', 'SaaS', 'agentic_ai', 'generic_url']),
    notes: 'Ranked marketplace tool; adapter remains stubbed until a real callable API is admitted.',
  },
  {
    step_name: 'build',
    rank: 6,
    platform_name: 'Replit',
    platform_type: 'cloud_ide',
    performance_score: 8.2,
    cost_score: 9,
    speed_score: 7,
    reliability_score: 8,
    target_classes: Object.freeze(['web', 'SaaS', 'generic_url']),
    notes: 'Ranked marketplace tool; execution/deploy surfaces are not the Step 3 code-generation adapter.',
  },
  {
    step_name: 'build',
    rank: 7,
    platform_name: 'Base44',
    platform_type: 'source',
    performance_score: 7,
    cost_score: 8,
    speed_score: 7,
    reliability_score: 7,
    target_classes: Object.freeze(['web', 'SaaS', 'generic_url']),
    notes: 'Ranked legacy substrate; project source export is not executable today.',
  },
]);

export function normalizeBuildToolName(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function buildToolRank(value) {
  return BUILD_TOOL_ORDER_BY_KEY[normalizeBuildToolName(value?.platform_name ?? value?.name ?? value)] ?? Number.POSITIVE_INFINITY;
}

export function compareBuildToolRank(a, b) {
  const rankA = buildToolRank(a);
  const rankB = buildToolRank(b);
  if (rankA !== rankB) return rankA - rankB;
  return 0;
}

export function canonicalBuildRankingRows() {
  return BUILD_TOOL_RANKING_ROWS.map(row => Object.freeze({
    ...row,
    target_classes: [...row.target_classes],
  }));
}
