export const VEU_PRODUCTS = [
  {
    name: 'SAIGE',
    url: 'https://saige.base44.app',
    tagline: 'AI-powered sustainability intelligence for universities',
    audience: 'university sustainability directors',
    audience_short: 'Sustainability Directors',
    demo_org: 'Lakewood University',
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    dot: 'bg-emerald-400',
    synthetic_prompt: `Generate complete synthetic demo data for SAIGE, an AI-powered sustainability intelligence platform targeting university sustainability directors. Create a fictional university called 'Lakewood University' — a mid-size private research university with 12,000 students in the northeastern United States.

Generate realistic data for:
1. Carbon emissions profile — Scope 1, 2, and 3 emissions based on EPA benchmarks for universities of this size. Include 3 years of historical data showing a reduction trend.
2. AASHE STARS rating — current rating of Silver with specific scores per category based on real STARS framework criteria
3. Five active sustainability projects — name, description, status, budget, emissions impact, project lead
4. Stakeholder dashboard — board of trustees sustainability committee, student sustainability council, facilities management team
5. AI agent interaction examples — five realistic questions a sustainability director would ask and compelling AI responses demonstrating SAIGE's intelligence
6. Key metrics — energy consumption, water usage, waste diversion rate, renewable energy percentage, all benchmarked against peer institutions

All data must be realistic, internally consistent, and compelling enough to convince a real university sustainability director that SAIGE solves their problem. Base all benchmarks on publicly available EPA, AASHE, and Department of Energy data for comparable institutions.

Return as JSON with keys: carbon_profile, stars_rating, projects, stakeholders, ai_examples, key_metrics.`,
  },
  {
    name: 'PressAI',
    url: 'https://pressai1.base44.app',
    tagline: 'AI publishing platform for authors and publishers',
    audience: 'authors, publishers, and content creators',
    audience_short: 'Publishers',
    demo_org: 'Meridian Press',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    dot: 'bg-blue-400',
    synthetic_prompt: `Generate complete synthetic demo data for PressAI, an AI publishing platform targeting authors, publishers, and content creators. Create a fictional mid-size independent publisher called 'Meridian Press' with a catalog of 200 titles across three imprints.

Generate realistic data for:
1. Active manuscript pipeline — 8 manuscripts at various stages from acquisition to publication
2. AI-generated press releases — three sample press releases for fictional book launches demonstrating PressAI's writing quality
3. Author roster — 12 fictional authors with bios, genres, and sales history
4. Publishing calendar — 6 months of scheduled releases with marketing milestones
5. Analytics dashboard — sales trends, genre performance, marketing ROI
6. AI Ghost Writer examples — three sample chapters demonstrating different genre styles

All data must reflect real publishing industry standards and demonstrate PressAI's value to a publishing professional.

Return as JSON with keys: manuscript_pipeline, press_releases, authors, publishing_calendar, analytics, ghostwriter_examples.`,
  },
  {
    name: 'ReachSMS',
    url: 'https://reachsms.base44.app',
    tagline: 'SMS community engagement for nonprofits',
    audience: 'nonprofits and community organizations',
    audience_short: 'Community Managers',
    demo_org: 'Bridges Community Network',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/5',
    dot: 'bg-purple-400',
    synthetic_prompt: `Generate complete synthetic demo data for ReachSMS, an SMS community engagement platform targeting nonprofits and community organizations. Create a fictional community organization called 'Bridges Community Network' serving 5,000 members across three neighborhoods.

Generate realistic data for:
1. Active campaigns — five SMS campaigns at various stages with open rates, response rates, and engagement metrics benchmarked against industry standards
2. Member segments — eight community segments with demographics and engagement profiles
3. Message history — sample conversations showing two-way SMS engagement
4. Event notifications — three upcoming community events with RSVP tracking
5. Analytics dashboard — delivery rates, engagement trends, opt-out rates, campaign ROI
6. AI message suggestions — five examples of AI-generated SMS content for different campaign types

All metrics must reflect real SMS marketing industry benchmarks.

Return as JSON with keys: campaigns, member_segments, message_history, events, analytics, ai_suggestions.`,
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
    synthetic_prompt: `Generate complete synthetic demo data for RelTwin, a relationship intelligence platform targeting coaches and HR professionals. Create a fictional executive coaching practice called 'Apex Leadership Partners' with 45 active clients.

Generate realistic data for:
1. Client relationship map — 45 clients with relationship strength scores, engagement history, and growth trajectories
2. Active coaching engagements — 8 detailed client profiles with goals, progress, and AI insights
3. Relationship health alerts — five clients flagged for relationship attention with specific AI recommendations
4. Session history — sample coaching session notes with AI-generated insights and action items
5. Analytics dashboard — client retention rate, relationship health trends, coaching outcome metrics
6. AI relationship intelligence examples — five compelling AI insights demonstrating RelTwin's unique value

All data must reflect real coaching and HR industry standards.

Return as JSON with keys: client_map, active_engagements, health_alerts, session_history, analytics, ai_insights.`,
  },
  {
    name: 'MyBirthSafe',
    url: 'https://mybirthsafe.base44.app',
    tagline: 'Personalized maternal health tracking for Africa',
    audience: 'pregnant women in Nigeria and Africa',
    audience_short: 'Healthcare Workers',
    demo_org: 'MyBirthSafe Cohort',
    color: 'text-rose-400',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5',
    dot: 'bg-rose-400',
    synthetic_prompt: `Generate complete synthetic demo data for MyBirthSafe, a personalized maternal health tracking app targeting pregnant women in Nigeria and Africa. Create a fictional cohort of 10 pregnant women at various stages of pregnancy.

Generate realistic data for:
1. Patient profiles — 10 pregnant women with ages, trimester, risk factors, and health histories reflecting Nigerian demographic realities
2. Pregnancy tracking data — weekly health metrics, appointment history, and milestone tracking based on WHO antenatal care guidelines
3. Risk alerts — three patients with flagged risk factors and AI-generated care recommendations
4. Healthcare provider dashboard — community health worker view showing patient cohort status
5. Educational content examples — five AI-generated health education messages in English and Pidgin English
6. Outcome tracking — delivery outcomes for five completed pregnancies showing MyBirthSafe's impact

All clinical data must reflect WHO guidelines for antenatal care in sub-Saharan Africa and Nigerian Ministry of Health standards.

Return as JSON with keys: patient_profiles, tracking_data, risk_alerts, provider_dashboard, educational_content, outcomes.`,
  },
];