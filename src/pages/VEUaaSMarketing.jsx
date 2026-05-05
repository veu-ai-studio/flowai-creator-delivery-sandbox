import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Zap, Shield, BarChart3, Layers, Users, Building2,
  ChevronRight, Globe, CheckCircle2, ArrowRight
} from 'lucide-react';
import ClearanceSimulator from '@/components/demo/ClearanceSimulator';
import CostChart from '@/components/demo/CostChart';
import OrchestratorDemo from '@/components/demo/OrchestratorDemo';
import DemoFooter from '@/components/demo/DemoFooter';

const VALUE_PROPS = [
  {
    icon: Zap, title: 'For AI Studios',
    desc: 'Run a portfolio of 3–30 AI products with one governance layer. Every product through the same 8-step pipeline. Every clearance check automated. One dashboard for all.',
    bullets: ['Automated clearance protocol', 'Multi-product cost tracking', 'Self-renewal per product'],
    color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20',
  },
  {
    icon: Users, title: 'For AI Agencies',
    desc: "Run client AI products like a software portfolio. Automated QA, clearance, and GTM readiness reports for every client. Deliver governance as a service.",
    bullets: ['Client-branded reports', 'Multi-tenant isolation', 'Billable governance cycles'],
    color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/20',
  },
  {
    icon: Building2, title: 'For Enterprise AI Teams',
    desc: 'Govern 50–5,000 AI products across divisions, regions, and risk tiers. Centralized oversight with autonomous governance hooks into every product.',
    bullets: ['Enterprise role-based access', 'Audit trail for compliance', 'Scales to any portfolio size'],
    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20',
  },
];

const TESTIMONIALS = [
  { name: 'Head of AI Products', company: 'Fintech Studio (Series B)', quote: '"FlowAI reduced our clearance cycle from 3 weeks to 9 minutes. Every product ships with governance baked in."' },
  { name: 'CTO', company: 'AI Agency (50 client products)', quote: '"We now deliver clearance reports as part of our retainer. It\'s a revenue line, not overhead."' },
  { name: 'VP Engineering', company: 'Enterprise AI Team (400+ models)', quote: '"The self-renewal loop catches regressions before our clients do. We look like heroes."' },
];

const INTERACTIVE_TABS = [
  { key: 'clearance', label: 'Watch a Clearance Check' },
  { key: 'cost',      label: 'See Cost Across Products' },
  { key: 'orchestrator', label: 'Try the Orchestrator' },
];

export default function VEUaaSMarketing() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('clearance');

  return (
    <div className="min-h-screen bg-background text-foreground font-inter">

      {/* ── NAV ── */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">VEUaaS</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold ml-1">by FlowAI</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/demo" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Try Sandbox</a>
            <a href="/live-demo" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Live Demo</a>
            <Button size="sm" onClick={() => navigate('/enterprise-demo')} className="gap-1.5 text-xs">
              Book a Demo <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6">

        {/* ── HERO ── */}
        <section className="py-20 lg:py-28 text-center space-y-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary font-semibold mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Multi-tenant AI portfolio governance — now available
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight max-w-4xl mx-auto">
              Govern your AI portfolio.<br />
              <span className="text-primary">From one to one thousand products.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-6 leading-relaxed">
              VEUaaS is the AI portfolio operating system. Every product through an 8-step governance pipeline.
              Automated clearance, self-renewal, and GTM readiness — for any team running multiple AI products.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate('/enterprise-demo')} className="gap-2 text-base px-8 min-h-[48px]">
              <Shield className="h-5 w-5" /> Book a Demo
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/demo')} className="gap-2 text-base px-8 min-h-[48px]">
              Try the Sandbox <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-muted-foreground">
            {['8-step governance pipeline', 'Automated clearance protocol', 'Self-renewal engine', 'Multi-tenant ready'].map(f => (
              <span key={f} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />{f}</span>
            ))}
          </motion.div>
        </section>

        {/* ── INTERACTIVE DEMOS ── */}
        <section className="py-16 space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">See it in action</h2>
            <p className="text-sm text-muted-foreground mt-2">No signup required. Click to explore.</p>
          </div>

          <div className="flex gap-1 justify-center border-b border-border pb-0">
            {INTERACTIVE_TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex justify-center pt-4">
            {activeTab === 'clearance'    && <ClearanceSimulator productName="SAIGE" />}
            {activeTab === 'cost'         && <CostChart />}
            {activeTab === 'orchestrator' && <OrchestratorDemo />}
          </div>
        </section>

        {/* ── VALUE PROPS ── */}
        <section className="py-16 space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Built for every team running AI at scale</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {VALUE_PROPS.map(v => (
              <div key={v.title} className={`rounded-xl border ${v.border} bg-card p-6 space-y-4`}>
                <div className={`h-10 w-10 rounded-xl ${v.bg} flex items-center justify-center`}>
                  <v.icon className={`h-5 w-5 ${v.color}`} />
                </div>
                <h3 className="text-base font-bold text-foreground">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                <ul className="space-y-1.5">
                  {v.bullets.map(b => (
                    <li key={b} className="flex items-center gap-2 text-xs text-foreground">
                      <CheckCircle2 className={`h-3.5 w-3.5 ${v.color} shrink-0`} /> {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── SOCIAL PROOF ── */}
        <section className="py-16 space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Trusted by AI product leaders</h2>
            <p className="text-xs text-muted-foreground mt-2">(Logo grid coming soon — launch partners TBA)</p>
          </div>
          {/* Logo placeholder */}
          <div className="flex flex-wrap justify-center gap-4">
            {['AI Studio A', 'Agency B', 'Enterprise C', 'Portfolio D', 'Venture E'].map(l => (
              <div key={l} className="h-10 px-6 rounded-lg border border-border bg-secondary/20 flex items-center justify-center">
                <span className="text-xs font-semibold text-muted-foreground">{l}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-sm text-foreground leading-relaxed italic">{t.quote}</p>
                <div>
                  <p className="text-xs font-semibold text-foreground">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING TEASE ── */}
        <section className="py-16">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-10 text-center space-y-5">
            <h2 className="text-2xl font-bold text-foreground">Pricing that scales with your portfolio</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              From a 5-product studio to a 5,000-product enterprise. VEUaaS is priced per product, per governance cycle —
              not per seat, not per user. The more you govern, the more you save.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              {['5 products — starter', '50 products — growth', '500 products — scale', '5,000+ products — enterprise'].map(p => (
                <span key={p} className="px-3 py-1.5 rounded-lg border border-border bg-card">{p}</span>
              ))}
            </div>
            <p className="text-sm font-semibold text-primary">Pricing revealed on the demo call.</p>
            <Button size="lg" onClick={() => navigate('/enterprise-demo')} className="gap-2 mt-2">
              Book a Demo to See Pricing <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section className="py-16 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/enterprise-demo')} className="gap-2 text-sm px-8 min-h-[48px]">
            <Globe className="h-4 w-4" /> Book a Demo
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/demo')} className="gap-2 text-sm px-8 min-h-[48px]">
            <Zap className="h-4 w-4" /> Try the Sandbox
          </Button>
        </section>

      </main>

      <DemoFooter />
    </div>
  );
}