// Complete tool registry for Platform Intelligence Marketplace
export const TOOL_REGISTRY = [
  // RESEARCH
  { name: 'Perplexity AI', category: 'Research', description: 'AI-powered research engine with real-time web access and cited answers.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free tier available; Pro $20/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://perplexity.ai', tags: ['research', 'ai', 'search'] },
  { name: 'Tavily', category: 'Research', description: 'Search API purpose-built for AI agents and LLM applications.', performance_score: 8, cost_tier: 'paid', cost_details: 'From $0.01/search; $9+/month plans', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://tavily.com', tags: ['research', 'api', 'agents'] },
  { name: 'Exa', category: 'Research', description: 'Neural search engine for developers needing semantic web search.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Free tier; paid from $5/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://exa.ai', tags: ['research', 'neural', 'semantic'] },
  { name: 'SerpAPI', category: 'Research', description: 'Real-time Google search results API for developers.', performance_score: 7, cost_tier: 'paid', cost_details: 'From $50/month; 100 free searches/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://serpapi.com', tags: ['research', 'google', 'scraping'] },
  { name: 'You.com', category: 'Research', description: 'AI search platform with customizable search APIs.', performance_score: 7, cost_tier: 'freemium', cost_details: 'Free web UI; API from $99/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://you.com', tags: ['research', 'ai', 'search'] },

  // DESIGN
  { name: 'Figma', category: 'Design', description: 'Industry-standard collaborative interface design and prototyping tool.', performance_score: 10, cost_tier: 'freemium', cost_details: 'Free for individuals; Pro $12/editor/month', underserved_accessible: 'yes', base44_compatible: 'none', production_compatible: true, official_url: 'https://figma.com', tags: ['design', 'ui', 'prototype', 'collaboration'] },
  { name: 'Framer', category: 'Design', description: 'Visual web design tool and CMS for publishing production-ready sites.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free; Mini $5/month; Basic $15/month', underserved_accessible: 'yes', base44_compatible: 'none', production_compatible: true, official_url: 'https://framer.com', tags: ['design', 'web', 'cms', 'no-code'] },
  { name: 'Canva', category: 'Design', description: 'Visual content creation platform for marketing and brand assets.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Free; Pro $15/month', underserved_accessible: 'yes', base44_compatible: 'none', production_compatible: true, official_url: 'https://canva.com', tags: ['design', 'marketing', 'brand', 'graphics'] },
  { name: 'Lovable', category: 'Design', description: 'AI-powered full-stack web app generator from natural language prompts.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Free tier; Starter $20/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://lovable.dev', tags: ['design', 'ai', 'builder', 'no-code'] },
  { name: 'v0 by Vercel', category: 'Design', description: 'AI UI component generator producing production-ready React code.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free tier available; Pro with Vercel subscription', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://v0.dev', tags: ['design', 'ai', 'react', 'components'] },

  // BUILD
  { name: 'Base44', category: 'Build', description: 'AI-native full-stack builder with built-in backend, auth, and database.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free tier; Pro $29/month', underserved_accessible: 'yes', base44_compatible: 'native', production_compatible: true, official_url: 'https://base44.com', tags: ['build', 'fullstack', 'ai', 'no-code', 'native'] },
  { name: 'Replit', category: 'Build', description: 'Browser-based collaborative IDE with instant deployment capabilities.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Free; Core $7/month; Teams $20/month', underserved_accessible: 'limited', base44_compatible: 'api', production_compatible: true, official_url: 'https://replit.com', tags: ['build', 'ide', 'collaboration', 'deployment'] },
  { name: 'Bolt', category: 'Build', description: 'AI full-stack web builder that generates and deploys complete applications.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Free tier; Pro $20/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://bolt.new', tags: ['build', 'ai', 'fullstack', 'deployment'] },
  { name: 'Cursor', category: 'Build', description: 'AI-powered code editor with deep codebase understanding and autocomplete.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free Hobby; Pro $20/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://cursor.sh', tags: ['build', 'ai', 'editor', 'ide'] },
  { name: 'Windsurf', category: 'Build', description: 'AI-first coding environment with agentic coding capabilities.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Free tier; Pro $15/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://codeium.com/windsurf', tags: ['build', 'ai', 'editor', 'agentic'] },

  // DATABASE
  { name: 'Supabase', category: 'Database', description: 'Open source Firebase alternative with Postgres, auth, storage, and realtime.', performance_score: 10, cost_tier: 'freemium', cost_details: 'Free tier; Pro $25/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://supabase.com', tags: ['database', 'postgres', 'realtime', 'auth', 'storage'] },
  { name: 'PlanetScale', category: 'Database', description: 'Serverless MySQL platform with branching and zero-downtime schema changes.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free Hobby (deprecated); Scaler $39/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://planetscale.com', tags: ['database', 'mysql', 'serverless', 'branching'] },
  { name: 'Firebase', category: 'Database', description: "Google's app development platform with NoSQL, auth, hosting, and functions.", performance_score: 9, cost_tier: 'freemium', cost_details: 'Spark free; Blaze pay-as-you-go', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://firebase.google.com', tags: ['database', 'nosql', 'realtime', 'google', 'auth'] },
  { name: 'Neon', category: 'Database', description: 'Serverless Postgres with branching, autoscaling, and instant provisioning.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free tier; Launch $19/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://neon.tech', tags: ['database', 'postgres', 'serverless', 'branching'] },
  { name: 'MongoDB Atlas', category: 'Database', description: 'Fully managed cloud document database with global distribution.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Free 512MB; M10 $57/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://www.mongodb.com/atlas', tags: ['database', 'nosql', 'document', 'cloud'] },

  // AUTHENTICATION
  { name: 'Supabase Auth', category: 'Authentication', description: 'Built-in authentication with social logins, magic links, and RLS policies.', performance_score: 9, cost_tier: 'free', cost_details: 'Included with Supabase free tier', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://supabase.com/docs/guides/auth', tags: ['auth', 'supabase', 'oauth', 'rls'] },
  { name: 'Clerk', category: 'Authentication', description: 'Complete user management platform with embeddable UI components.', performance_score: 10, cost_tier: 'freemium', cost_details: 'Free up to 10k MAU; Pro $25/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://clerk.com', tags: ['auth', 'user-management', 'components', 'webhooks'] },
  { name: 'Auth0', category: 'Authentication', description: 'Enterprise-grade identity platform with extensive SSO and MFA options.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free 7500 MAU; Essential $23/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://auth0.com', tags: ['auth', 'enterprise', 'sso', 'mfa'] },
  { name: 'Firebase Auth', category: 'Authentication', description: "Google's free authentication service with phone, social, and email sign-in.", performance_score: 9, cost_tier: 'free', cost_details: 'Free with Firebase; phone auth has costs', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://firebase.google.com/products/auth', tags: ['auth', 'google', 'phone', 'social'] },
  { name: 'NextAuth', category: 'Authentication', description: 'Open source authentication for Next.js with 50+ provider integrations.', performance_score: 8, cost_tier: 'free', cost_details: 'Completely free and open source', underserved_accessible: 'yes', base44_compatible: 'none', production_compatible: true, official_url: 'https://next-auth.js.org', tags: ['auth', 'nextjs', 'open-source', 'oauth'] },

  // DEPLOYMENT
  { name: 'Vercel', category: 'Deployment', description: 'Frontend cloud platform with edge network, CI/CD, and serverless functions.', performance_score: 10, cost_tier: 'freemium', cost_details: 'Free Hobby; Pro $20/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://vercel.com', tags: ['deployment', 'frontend', 'serverless', 'cdn', 'ci-cd'] },
  { name: 'Railway', category: 'Deployment', description: 'Full-stack deployment platform for apps, databases, and background workers.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free $5 credit/month; Pro $20/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://railway.app', tags: ['deployment', 'fullstack', 'docker', 'databases'] },
  { name: 'Render', category: 'Deployment', description: 'Cloud application hosting with automatic deploys from Git.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Free tier; Individual $7/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://render.com', tags: ['deployment', 'cloud', 'git', 'docker'] },
  { name: 'Fly.io', category: 'Deployment', description: 'Global application deployment running full-stack apps close to users.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free allowance; pay-as-you-go after', underserved_accessible: 'limited', base44_compatible: 'api', production_compatible: true, official_url: 'https://fly.io', tags: ['deployment', 'global', 'docker', 'edge'] },
  { name: 'Netlify', category: 'Deployment', description: 'Web hosting and automation platform with instant rollbacks and edge functions.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Free tier; Pro $19/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://netlify.com', tags: ['deployment', 'frontend', 'cdn', 'forms', 'functions'] },

  // PAYMENTS
  { name: 'Stripe', category: 'Payments', description: 'Global payment processing infrastructure for internet businesses.', performance_score: 10, cost_tier: 'paid', cost_details: '2.9% + $0.30 per transaction', underserved_accessible: 'limited', base44_compatible: 'api', production_compatible: true, official_url: 'https://stripe.com', tags: ['payments', 'global', 'subscriptions', 'api'] },
  { name: 'Paystack', category: 'Payments', description: 'African payment gateway powering thousands of businesses across the continent.', performance_score: 10, cost_tier: 'paid', cost_details: '1.5% + ₦100 per transaction (Nigeria)', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://paystack.com', tags: ['payments', 'africa', 'nigeria', 'subscriptions'] },
  { name: 'Flutterwave', category: 'Payments', description: 'Pan-African payments platform supporting 30+ African currencies.', performance_score: 9, cost_tier: 'paid', cost_details: '1.4% per transaction; varies by country', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://flutterwave.com', tags: ['payments', 'africa', 'pan-african', 'multicurrency'] },
  { name: 'Paddle', category: 'Payments', description: 'Revenue delivery platform handling taxes, compliance, and subscriptions.', performance_score: 8, cost_tier: 'paid', cost_details: '5% + $0.50 per transaction', underserved_accessible: 'limited', base44_compatible: 'api', production_compatible: true, official_url: 'https://paddle.com', tags: ['payments', 'saas', 'subscriptions', 'tax-compliance'] },
  { name: 'Lemonsqueezy', category: 'Payments', description: 'Merchant of record handling global payments, VAT, and SaaS billing.', performance_score: 8, cost_tier: 'paid', cost_details: '5% + $0.50 per transaction', underserved_accessible: 'limited', base44_compatible: 'api', production_compatible: true, official_url: 'https://lemonsqueezy.com', tags: ['payments', 'saas', 'merchant-of-record', 'vat'] },

  // SMS AND MESSAGING
  { name: 'Twilio', category: 'SMS', description: 'Cloud communications platform for SMS, voice, email, and WhatsApp.', performance_score: 10, cost_tier: 'paid', cost_details: '$0.0079/SMS sent; $0.0075/SMS received (US)', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://twilio.com', tags: ['sms', 'voice', 'whatsapp', 'communications'] },
  { name: "Africa's Talking", category: 'SMS', description: "Africa-first SMS, voice, USSD, and mobile data API platform.", performance_score: 10, cost_tier: 'paid', cost_details: 'From $0.01/SMS (Nigeria); varies by country', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://africastalking.com', tags: ['sms', 'africa', 'ussd', 'voice', 'nigeria'] },
  { name: 'Vonage', category: 'SMS', description: 'Cloud communications platform with SMS, voice, and video APIs.', performance_score: 8, cost_tier: 'paid', cost_details: 'From $0.0062/SMS; pay-as-you-go', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://vonage.com', tags: ['sms', 'voice', 'video', 'communications'] },
  { name: 'MessageBird', category: 'SMS', description: 'Omnichannel communications platform with SMS, WhatsApp, and email.', performance_score: 8, cost_tier: 'paid', cost_details: 'Pay-as-you-go; volume discounts available', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://messagebird.com', tags: ['sms', 'omnichannel', 'whatsapp', 'communications'] },
  { name: 'Termii', category: 'SMS', description: 'African messaging platform for OTP, bulk SMS, and WhatsApp notifications.', performance_score: 9, cost_tier: 'paid', cost_details: 'Pay-as-you-go; Nigeria-competitive rates', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://termii.com', tags: ['sms', 'africa', 'nigeria', 'otp', 'whatsapp'] },

  // AI AND LLM
  { name: 'Anthropic Claude', category: 'AI/LLM', description: 'Advanced AI assistant known for safety, reasoning, and long context handling.', performance_score: 10, cost_tier: 'paid', cost_details: 'Claude 3.5 Sonnet: $3/$15 per M tokens in/out', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://anthropic.com', tags: ['ai', 'llm', 'reasoning', 'safety', 'long-context'] },
  { name: 'OpenAI GPT-4', category: 'AI/LLM', description: 'Industry-leading large language model for text, code, vision, and function calling.', performance_score: 10, cost_tier: 'paid', cost_details: 'GPT-4o: $5/$15 per M tokens in/out', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://openai.com', tags: ['ai', 'llm', 'gpt', 'vision', 'function-calling'] },
  { name: 'Google Gemini', category: 'AI/LLM', description: 'Multimodal AI from Google with strong reasoning and 1M token context window.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Gemini 1.5 Flash free tier; Pro $7/M tokens', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://ai.google.dev', tags: ['ai', 'llm', 'multimodal', 'google', 'long-context'] },
  { name: 'Mistral', category: 'AI/LLM', description: 'Efficient open-source and commercial LLMs with European hosting options.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Open models free; API from $0.25/M tokens', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://mistral.ai', tags: ['ai', 'llm', 'open-source', 'efficient', 'european'] },
  { name: 'Groq', category: 'AI/LLM', description: 'Ultra-fast LLM inference running open models at 500+ tokens/second.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free tier; pay-as-you-go from $0.27/M tokens', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://groq.com', tags: ['ai', 'llm', 'inference', 'fast', 'open-source'] },

  // TESTING
  { name: 'Playwright', category: 'Testing', description: 'End-to-end browser testing framework by Microsoft for all major browsers.', performance_score: 10, cost_tier: 'free', cost_details: 'Completely free and open source', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://playwright.dev', tags: ['testing', 'e2e', 'browser', 'automation', 'microsoft'] },
  { name: 'Cypress', category: 'Testing', description: 'Frontend testing framework with time-travel debugging and automatic waiting.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free open source; Cloud from $67/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://cypress.io', tags: ['testing', 'e2e', 'frontend', 'debugging'] },
  { name: 'Vitest', category: 'Testing', description: 'Blazing fast unit testing framework powered by Vite with Jest compatibility.', performance_score: 9, cost_tier: 'free', cost_details: 'Completely free and open source', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://vitest.dev', tags: ['testing', 'unit', 'vite', 'fast', 'jest-compatible'] },
  { name: 'Jest', category: 'Testing', description: "JavaScript testing framework with built-in coverage and snapshot testing.", performance_score: 8, cost_tier: 'free', cost_details: 'Completely free and open source', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://jestjs.io', tags: ['testing', 'unit', 'javascript', 'snapshots'] },
  { name: 'Postman', category: 'Testing', description: 'API testing platform for building, testing, and documenting APIs.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free basic; Basic $14/user/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://postman.com', tags: ['testing', 'api', 'documentation', 'collections'] },

  // MONITORING
  { name: 'Sentry', category: 'Monitoring', description: 'Error tracking and performance monitoring for every language and platform.', performance_score: 10, cost_tier: 'freemium', cost_details: 'Free 5k errors/month; Team $26/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://sentry.io', tags: ['monitoring', 'errors', 'performance', 'alerts'] },
  { name: 'LogRocket', category: 'Monitoring', description: 'Frontend monitoring with session replay, logs, and network tracking.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free 1k sessions/month; Team $99/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://logrocket.com', tags: ['monitoring', 'session-replay', 'frontend', 'debugging'] },
  { name: 'Datadog', category: 'Monitoring', description: 'Full-stack cloud monitoring platform for metrics, logs, and traces.', performance_score: 9, cost_tier: 'paid', cost_details: 'Infrastructure $15/host/month; various modules', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://datadoghq.com', tags: ['monitoring', 'apm', 'logs', 'infrastructure', 'enterprise'] },
  { name: 'PostHog', category: 'Monitoring', description: 'Open source product analytics with session recording and feature flags.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free 1M events/month; paid from $0/month+', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://posthog.com', tags: ['monitoring', 'analytics', 'product', 'feature-flags', 'open-source'] },
  { name: 'Uptime Robot', category: 'Monitoring', description: 'Website uptime monitoring with 5-minute checks and instant alerts.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Free 50 monitors; Solo $7/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://uptimerobot.com', tags: ['monitoring', 'uptime', 'alerts', 'status-page'] },

  // EMAIL
  { name: 'Resend', category: 'Email', description: 'Email API for developers with beautiful templates and high deliverability.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free 3k emails/month; Pro $20/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://resend.com', tags: ['email', 'transactional', 'api', 'developer-first'] },
  { name: 'SendGrid', category: 'Email', description: 'Email delivery service with marketing campaigns and transactional APIs.', performance_score: 9, cost_tier: 'freemium', cost_details: 'Free 100/day; Essentials $19.95/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://sendgrid.com', tags: ['email', 'transactional', 'marketing', 'twilio'] },
  { name: 'Mailchimp', category: 'Email', description: 'Email marketing platform with automation, segmentation, and analytics.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Free 500 contacts; Essentials from $13/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://mailchimp.com', tags: ['email', 'marketing', 'automation', 'newsletters'] },
  { name: 'Postmark', category: 'Email', description: 'Transactional email service focused on speed and deliverability.', performance_score: 9, cost_tier: 'paid', cost_details: '$15/month for 10k emails; pay-as-you-go available', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://postmarkapp.com', tags: ['email', 'transactional', 'deliverability', 'speed'] },
  { name: 'Brevo', category: 'Email', description: 'Marketing platform with email, SMS, WhatsApp, and CRM capabilities.', performance_score: 8, cost_tier: 'freemium', cost_details: 'Free 300 emails/day; Starter $25/month', underserved_accessible: 'yes', base44_compatible: 'api', production_compatible: true, official_url: 'https://brevo.com', tags: ['email', 'sms', 'marketing', 'crm', 'whatsapp'] },

  // GOVERNANCE
  { name: 'FlowAI', category: 'Governance', description: "VEU AI Studio's proprietary AI governance and product lifecycle management platform.", performance_score: 10, cost_tier: 'proprietary', cost_details: 'Proprietary — VEU AI Studio internal platform', underserved_accessible: 'yes', base44_compatible: 'native', production_compatible: true, official_url: 'https://truthful-flow-logic-lab.base44.app', tags: ['governance', 'qa', 'autonomous', 'veu-ai-studio', 'proprietary', 'native'] },
];

export const CATEGORIES = [
  'All', 'Research', 'Design', 'Build', 'Database', 'Authentication',
  'Deployment', 'Payments', 'SMS', 'AI/LLM', 'Testing', 'Monitoring', 'Email', 'Governance'
];

export const VEU_STACKS = {
  SAIGE: {
    Build: ['Base44'],
    Database: ['Supabase'],
    Deployment: ['Vercel'],
    Authentication: ['Supabase Auth'],
    'AI/LLM': ['NeuralMax Pro'],
    Monitoring: ['Sentry'],
    Email: ['Resend'],
    Payments: ['Stripe'],
    Governance: ['FlowAI'],
  },
  PressAI: {
    Build: ['Base44'],
    Database: ['Supabase'],
    Deployment: ['Railway'],
    Authentication: ['Clerk'],
    'AI/LLM': ['Anthropic Claude'],
    Monitoring: ['PostHog'],
    Email: ['Resend'],
    Payments: ['Stripe', 'Paystack'],
    Governance: ['FlowAI'],
  },
  ReachSMS: {
    Build: ['Base44'],
    Database: ['Supabase'],
    Deployment: ['Railway'],
    Authentication: ['Supabase Auth'],
    SMS: ["Africa's Talking", 'Twilio'],
    'AI/LLM': ['Anthropic Claude'],
    Monitoring: ['Sentry'],
    Payments: ['Paystack', 'Flutterwave'],
    Governance: ['FlowAI'],
  },
  RelTwin: {
    Build: ['Base44'],
    Database: ['Supabase'],
    Deployment: ['Vercel'],
    Authentication: ['Clerk'],
    'AI/LLM': ['Anthropic Claude'],
    Monitoring: ['PostHog'],
    Email: ['Resend'],
    Payments: ['Stripe'],
    Governance: ['FlowAI'],
  },
  MyPregLife: {
    Build: ['Base44'],
    Database: ['Supabase'],
    Deployment: ['Railway'],
    Authentication: ['Supabase Auth'],
    SMS: ["Africa's Talking", 'Termii'],
    'AI/LLM': ['Anthropic Claude'],
    Monitoring: ['Sentry'],
    Email: ['Brevo'],
    Payments: ['Paystack', 'Flutterwave'],
    Governance: ['FlowAI'],
  },
};