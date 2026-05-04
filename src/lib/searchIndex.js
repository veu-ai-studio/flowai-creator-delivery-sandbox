// FlowAI Internal Search Index
export const searchIndex = [
  // Self-Verification (Primary)
  {
    id: 'self-verification-console',
    name: 'Autopilot Verification Console',
    category: 'Tool',
    route: '/self-verification',
    description: 'Autonomous QA loop - build, test, fix, redeploy, retest',
    keywords: ['self-verification', 'autopilot', 'verification', 'qa', 'testing', 'autonomous'],
    type: 'page',
    icon: 'CheckCircle2',
  },
  {
    id: 'self-verification-function',
    name: 'selfVerificationEngine Function',
    category: 'Backend',
    description: 'Backend function that runs autonomous verification loop',
    keywords: ['self-verification', 'engine', 'function', 'backend', 'verification'],
    type: 'function',
    status: 'deployed',
  },

  // Core Pages
  {
    id: 'dashboard',
    name: 'Dashboard',
    category: 'Core',
    route: '/',
    description: 'Main dashboard - flows, metrics, quick access',
    keywords: ['dashboard', 'home', 'overview', 'metrics'],
    type: 'page',
    icon: 'LayoutDashboard',
  },
  {
    id: 'flow-designer',
    name: 'Flow Designer',
    category: 'Core',
    route: '/flow-designer',
    description: 'Visual flow builder - create and manage automations',
    keywords: ['flow', 'designer', 'builder', 'automation', 'workflow'],
    type: 'page',
    icon: 'GitBranch',
  },
  {
    id: 'qa-audit',
    name: 'QA / Audit',
    category: 'Quality',
    route: '/qa-audit',
    description: 'Multi-layer QA auditing - UI, API, logic, business value',
    keywords: ['qa', 'audit', 'quality', 'testing', 'validation'],
    type: 'page',
    icon: 'BarChart3',
  },
  {
    id: 'research',
    name: 'Research Engine',
    category: 'Discovery',
    route: '/research',
    description: 'Competitive analysis and market research',
    keywords: ['research', 'market', 'competitive', 'analysis', 'discovery'],
    type: 'page',
    icon: 'Search',
  },
  {
    id: 'design',
    name: 'Design Engine',
    category: 'Creation',
    route: '/design',
    description: 'Product design and UX specification generation',
    keywords: ['design', 'ux', 'product', 'specification', 'creation'],
    type: 'page',
    icon: 'Layers',
  },
  {
    id: 'build',
    name: 'Build Engine',
    category: 'Creation',
    route: '/build',
    description: 'Code generation and component building',
    keywords: ['build', 'code', 'generation', 'components', 'structure'],
    type: 'page',
    icon: 'Hammer',
  },
  {
    id: 'pipeline',
    name: 'Pipeline Orchestration',
    category: 'Orchestration',
    route: '/pipeline',
    description: 'Multi-agent workflow orchestration and execution',
    keywords: ['pipeline', 'orchestration', 'workflow', 'agents', 'execution'],
    type: 'page',
    icon: 'Workflow',
  },
  {
    id: 'realtime-dashboard',
    name: 'Realtime Dashboard',
    category: 'Monitoring',
    route: '/realtime',
    description: 'Live system activity and performance metrics',
    keywords: ['realtime', 'dashboard', 'monitoring', 'activity', 'metrics'],
    type: 'page',
    icon: 'Activity',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    category: 'Reporting',
    route: '/analytics',
    description: 'Flow execution analytics and performance trends',
    keywords: ['analytics', 'reporting', 'performance', 'trends', 'execution'],
    type: 'page',
    icon: 'BarChart2',
  },
  {
    id: 'ai-feedback',
    name: 'AI Feedback Loop',
    category: 'Optimization',
    route: '/ai-feedback',
    description: 'AI-driven optimization recommendations',
    keywords: ['ai', 'feedback', 'optimization', 'improvement', 'recommendations'],
    type: 'page',
    icon: 'Brain',
  },
  {
    id: 'marketplace',
    name: 'AI Model Marketplace',
    category: 'Tools',
    route: '/marketplace',
    description: 'Browse and integrate AI models',
    keywords: ['marketplace', 'models', 'ai', 'integration', 'tools'],
    type: 'page',
    icon: 'ShoppingBag',
  },
  {
    id: 'intelligence',
    name: 'Platform Intelligence',
    category: 'Analysis',
    route: '/intelligence',
    description: 'Tech stack analysis and decision engine',
    keywords: ['intelligence', 'analysis', 'tech', 'stack', 'decision'],
    type: 'page',
    icon: 'Cpu',
  },
  {
    id: 'gtm',
    name: 'GTM Platform',
    category: 'Infrastructure',
    route: '/gtm',
    description: '7-layer infrastructure management',
    keywords: ['gtm', 'infrastructure', 'platform', 'layers', 'management'],
    type: 'page',
    icon: 'Rocket',
  },

  // Upgrade/Billing
  {
    id: 'self-upgrade',
    name: 'Self-Upgrade',
    category: 'Optimization',
    route: '/self-upgrade',
    description: 'Autonomous system optimization',
    keywords: ['upgrade', 'optimization', 'improvement', 'self'],
    type: 'page',
    icon: 'ArrowUpCircle',
  },
  {
    id: 'external-upgrade',
    name: 'External Product Upgrade',
    category: 'Tools',
    route: '/external-upgrade',
    description: 'Audit and improve external URLs',
    keywords: ['upgrade', 'external', 'product', 'audit', 'improvement'],
    type: 'page',
    icon: 'Sparkles',
  },
  {
    id: 'billing',
    name: 'Billing',
    category: 'Account',
    route: '/billing',
    description: 'Subscription and usage management',
    keywords: ['billing', 'subscription', 'payment', 'usage', 'plan'],
    type: 'page',
    icon: 'CreditCard',
  },

  // Reports/Outputs
  {
    id: 'run-history',
    name: 'Run History',
    category: 'Reports',
    route: '/run-history',
    description: 'Flow execution history and logs',
    keywords: ['run', 'history', 'logs', 'execution', 'report'],
    type: 'page',
    icon: 'History',
  },
  {
    id: 'activity-log',
    name: 'Activity Log',
    category: 'Reports',
    route: '/activity',
    description: 'System activity and audit trail',
    keywords: ['activity', 'log', 'audit', 'trail', 'history'],
    type: 'page',
    icon: 'ClipboardList',
  },
];

export function searchFeatures(query) {
  if (!query || query.length < 1) return [];

  const q = query.toLowerCase();
  return searchIndex
    .filter(item => 
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.some(k => k.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    )
    .sort((a, b) => {
      // Prioritize exact keyword matches
      const aMatch = a.keywords.some(k => k.toLowerCase() === q);
      const bMatch = b.keywords.some(k => k.toLowerCase() === q);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;

      // Then prioritize name matches
      const aName = a.name.toLowerCase().includes(q);
      const bName = b.name.toLowerCase().includes(q);
      if (aName && !bName) return -1;
      if (!aName && bName) return 1;

      return 0;
    });
}