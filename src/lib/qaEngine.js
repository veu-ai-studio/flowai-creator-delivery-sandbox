/**
 * QA/Audit Engine
 * Mock implementation with full multi-layer scoring
 * Designed to accept real crawl data later
 */

function scoreUIUX(crawlData) {
  // Mock analysis of UI/UX
  const issues = [];
  const score = 7;

  if (!crawlData.pages || crawlData.pages.length === 0) {
    issues.push('No pages detected');
  }
  if (crawlData.screenshots?.length < crawlData.pages?.length) {
    issues.push('Missing screenshots for some pages');
  }

  return {
    score,
    issues,
    details: {
      navigation_clarity: 'Good',
      interaction_issues: issues.length > 0 ? 'Found' : 'None',
      layout_logic: 'Acceptable',
      user_flow_gaps: issues.length > 0 ? 'Yes' : 'No',
    },
  };
}

function scoreAPI(crawlData) {
  // Mock analysis of API layer
  const issues = [];
  const score = 6;

  if (!crawlData.api_endpoints || crawlData.api_endpoints.length === 0) {
    issues.push('No API endpoints detected');
  } else {
    crawlData.api_endpoints.forEach((ep) => {
      if (!ep.status || ep.status >= 400) {
        issues.push(`API endpoint failed: ${ep.path}`);
      }
    });
  }

  return {
    score: Math.max(1, score - issues.length),
    issues,
    details: {
      endpoint_availability: crawlData.api_endpoints?.length > 0 ? 'Partial' : 'None',
      response_structure: 'Unknown',
      error_handling: issues.length > 0 ? 'Issues found' : 'Acceptable',
      performance: 'Not tested',
    },
  };
}

function scoreLogic(crawlData) {
  // Mock analysis of logic layer
  const issues = [];
  const score = 7;

  if (crawlData.errors && crawlData.errors.length > 0) {
    issues.push(...crawlData.errors);
  }

  return {
    score: Math.max(1, score - crawlData.errors?.length * 0.5),
    issues,
    details: {
      state_management: crawlData.errors?.length > 0 ? 'Issues detected' : 'Stable',
      flow_execution: 'Nominal',
      transitions: 'Smooth',
      error_recovery: issues.length > 0 ? 'Needs work' : 'Good',
    },
  };
}

function scoreBusinessValue(crawlData) {
  // Mock analysis of business value
  const issues = [];
  const score = 6;

  if (!crawlData.pages || crawlData.pages.length < 3) {
    issues.push('Limited feature coverage');
  }
  if (!crawlData.api_endpoints || crawlData.api_endpoints.length === 0) {
    issues.push('No backend integration detected');
  }

  return {
    score: Math.max(1, score - issues.length * 0.5),
    issues,
    details: {
      user_outcome_clarity: issues.length > 0 ? 'Unclear' : 'Clear',
      friction_points: issues.length > 0 ? 'Present' : 'Minimal',
      conversion_blockers: issues.length > 0 ? 'Yes' : 'None',
      value_delivery: issues.length > 0 ? 'Limited' : 'Strong',
    },
  };
}

function generateRecommendations(allScores) {
  const recommendations = [];

  Object.entries(allScores).forEach(([layer, data]) => {
    if (data.score < 5) {
      recommendations.push({
        priority: 'critical',
        layer,
        action: `Critical issues in ${layer} layer (score: ${data.score}/10)`,
        details: data.issues.slice(0, 2),
      });
    } else if (data.score < 7) {
      recommendations.push({
        priority: 'high',
        layer,
        action: `Improve ${layer} layer (score: ${data.score}/10)`,
        details: data.issues.slice(0, 2),
      });
    }
  });

  return recommendations.sort((a, b) => {
    const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityMap[a.priority] - priorityMap[b.priority];
  });
}

export async function runQAAudit(crawlData) {
  // Mock crawl if no data provided
  const mockCrawl = crawlData || {
    url: 'https://example.com',
    pages: ['home', 'features', 'dashboard'],
    links: [],
    errors: ['Failed to load dashboard widget'],
    api_endpoints: [
      { path: '/api/flows', status: 200 },
      { path: '/api/runs', status: 200 },
      { path: '/api/analytics', status: 500 },
    ],
    screenshots: ['home.png', 'features.png'],
  };

  // Score all layers
  const uiux = scoreUIUX(mockCrawl);
  const api = scoreAPI(mockCrawl);
  const logic = scoreLogic(mockCrawl);
  const business = scoreBusinessValue(mockCrawl);

  // Calculate overall score
  const overallScore = Math.round((uiux.score + api.score + logic.score + business.score) / 4);

  // Generate recommendations
  const recommendations = generateRecommendations({
    ui_ux: uiux,
    api,
    logic,
    business_value: business,
  });

  return {
    timestamp: new Date().toISOString(),
    url: mockCrawl.url,
    scores: {
      ui_ux: uiux.score,
      api: api.score,
      logic: logic.score,
      business_value: business.score,
      overall: overallScore,
    },
    details: {
      ui_ux: uiux.details,
      api: api.details,
      logic: logic.details,
      business_value: business.details,
    },
    issues: {
      ui_ux: uiux.issues,
      api: api.issues,
      logic: logic.issues,
      business_value: business.issues,
    },
    recommendations,
    crawlData: mockCrawl,
  };
}