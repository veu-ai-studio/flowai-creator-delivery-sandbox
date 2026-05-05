import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building2, CheckCircle2, ChevronRight, ChevronLeft,
  Loader2, Layers, Play, ShieldCheck, DollarSign,
  BarChart3, Zap, Calendar, X
} from 'lucide-react';
import DemoFooter from '@/components/demo/DemoFooter';

const TOUR_STEPS = [
  {
    key: 'portfolio',
    title: 'Portfolio Dashboard',
    icon: Layers,
    desc: 'Your command center. Every AI product in one view — health scores, active runs, demo-readiness, and pending governance gates.',
    highlight: 'Notice the traffic-light health system: green (≥7), amber (≥5), red (<5). No product ships without hitting green.',
    screenshot_placeholder: 'Portfolio grid with 5 product cards, scores, and clearance badges',
  },
  {
    key: 'registry',
    title: 'Product Registry',
    icon: Layers,
    desc: 'The source of truth for your AI portfolio. Every product registered, versioned, and tracked — from beta to cleared for public launch.',
    highlight: 'Products move through statuses: Beta → Active → Cleared. Registry is the audit trail for investor and compliance reviews.',
    screenshot_placeholder: 'Sortable table: 5 products, slug, org, status badge, last run date, demo score',
  },
  {
    key: 'run',
    title: 'Workspace Run',
    icon: Play,
    desc: 'Launch an 8-step governance run in one click. Auto, Guided, or Manual — FlowAI executes Research → Design → Build → QA → Deploy → Self-Renewal → GTM → Monitor.',
    highlight: 'Auto mode completes all 8 steps in 8–12 minutes. Guided mode adds human approval gates at each step.',
    screenshot_placeholder: 'Live run view: 8 step cards, progress bar, step results expanding, final clearance decision',
  },
  {
    key: 'clearance',
    title: 'Clearance Check',
    icon: ShieldCheck,
    desc: '6 mandatory checkpoints before any product goes live: Governance Audit, Launch Readiness, White-Label, Data Export, Demo Readiness, Final Sign-Off.',
    highlight: 'Clearance is the compliance layer. Every VEU product must clear all 6 steps before its custom domain goes live.',
    screenshot_placeholder: 'Clearance wizard: 6 steps, step details, pass/fail per checkpoint, final cleared badge',
  },
  {
    key: 'cost',
    title: 'Cost Analysis',
    icon: DollarSign,
    desc: 'Full cost visibility across all products, providers, and sessions. Daily breakdown, per-product budgets, and over-budget alerts.',
    highlight: 'At scale, cost governance is as important as quality governance. VEUaaS tracks every dollar spent on every product.',
    screenshot_placeholder: 'Bar chart by product, session log table with per-row cost, budget alert panel',
  },
  {
    key: 'governance',
    title: 'Governance Audit',
    icon: BarChart3,
    desc: 'Tamper-evident governance log for every FlowAI action. Full audit trail for compliance, investor review, and enterprise security.',
    highlight: 'Every run, clearance decision, and self-renewal cycle is logged with timestamp, user, and outcome.',
    screenshot_placeholder: 'Audit log table: action, product, timestamp, outcome, user. Export button.',
  },
  {
    key: 'orchestrator',
    title: 'Orchestrator',
    icon: Zap,
    desc: 'Three input modes: Describe a product from scratch, Clone and improve an existing URL, or Synthesize the best elements from 2–5 competing products.',
    highlight: 'The orchestrator is where new products are born. One session produces a full governance-ready product specification.',
    screenshot_placeholder: 'Configuration page: 3 mode cards, objective selector, auto parameters, launch buttons',
  },
];

const USE_CASES = ['Building a multi-product AI studio', 'Agency running AI products for clients', 'Enterprise AI governance', 'Investor portfolio oversight', 'Other'];
const PRODUCT_COUNTS = ['1–5', '6–20', '21–100', '100+'];

export default function EnterpriseDemo() {
  const navigate = useNavigate();

  // Lead form state
  const [form, setForm] = useState({ name: '', email: '', company: '', ai_product_count: '', use_case: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Tour state
  const [tourStep, setTourStep] = useState(0);
  const [showCalendly, setShowCalendly] = useState(false);

  // Persist tour progress per email
  useEffect(() => {
    if (!form.email) return;
    const saved = localStorage.getItem(`flowai_tour_${form.email}`);
    if (saved) setTourStep(parseInt(saved, 10) || 0);
  }, [form.email]);

  useEffect(() => {
    if (submitted && form.email) {
      localStorage.setItem(`flowai_tour_${form.email}`, String(tourStep));
    }
  }, [tourStep, submitted, form.email]);

  const submitLead = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.company.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'enterprise_demo', tier: 4 }),
      });
    } catch {}
    setSubmitting(false);
    setSubmitted(true);
  };

  const step = TOUR_STEPS[tourStep];
  const StepIcon = step?.icon;
  const isLast = tourStep === TOUR_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background text-foreground font-inter">

      {/* Nav */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">FlowAI Enterprise Demo</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/veuaas')} className="text-xs h-8">Marketing Site</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/demo')} className="text-xs h-8">Sandbox</Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">

        <AnimatePresence mode="wait">

          {/* ── LEAD FORM ── */}
          {!submitted && (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="max-w-xl mx-auto space-y-8">
              <div className="text-center space-y-3">
                <div className="inline-flex h-12 w-12 rounded-xl bg-primary/10 items-center justify-center mx-auto">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">Enterprise Demo</h1>
                <p className="text-sm text-muted-foreground">
                  A 7-step guided walkthrough of FlowAI — tailored to your team size and AI portfolio. Tell us about yourself to begin.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Full Name *</label>
                    <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Alex Johnson" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Work Email *</label>
                    <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="alex@company.com" type="email" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Company *</label>
                    <Input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Acme AI Studio" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">AI Products in Portfolio</label>
                    <select value={form.ai_product_count} onChange={e => setForm(p => ({ ...p, ai_product_count: e.target.value }))}
                      className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value="">Select range</option>
                      {PRODUCT_COUNTS.map(c => <option key={c} value={c}>{c} products</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Primary Use Case</label>
                  <div className="flex flex-wrap gap-2">
                    {USE_CASES.map(uc => (
                      <button key={uc} onClick={() => setForm(p => ({ ...p, use_case: uc }))}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all font-semibold ${form.use_case === uc ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                        {uc}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={submitLead} disabled={submitting || !form.name.trim() || !form.email.trim() || !form.company.trim()} className="w-full gap-2 mt-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                  {submitting ? 'Starting your demo…' : 'Start the 7-Step Guided Tour'}
                </Button>

                <p className="text-[10px] text-muted-foreground text-center">
                  By continuing you agree to receive one follow-up email. No spam.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── TOUR ── */}
          {submitted && (
            <motion.div key="tour" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Step {tourStep + 1} of {TOUR_STEPS.length}</span>
                  <span className="font-semibold text-foreground">{step.title}</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${((tourStep + 1) / TOUR_STEPS.length) * 100}%` }} />
                </div>
                {/* Step dots */}
                <div className="flex gap-1 justify-center mt-2">
                  {TOUR_STEPS.map((s, i) => (
                    <button key={s.key} onClick={() => setTourStep(i)}
                      aria-label={`Go to step ${i + 1}: ${s.title}`}
                      className={`h-2 rounded-full transition-all ${i === tourStep ? 'w-6 bg-primary' : i < tourStep ? 'w-2 bg-primary/40' : 'w-2 bg-border'}`} />
                  ))}
                </div>
              </div>

              {/* Step card */}
              <AnimatePresence mode="wait">
                <motion.div key={step.key} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-border bg-card overflow-hidden">

                  {/* Screenshot placeholder */}
                  <div className="aspect-video bg-secondary/20 border-b border-border flex items-center justify-center relative">
                    <div className="text-center px-8 space-y-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                        <StepIcon className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">{step.screenshot_placeholder}</p>
                      <p className="text-[10px] text-muted-foreground/60">Screenshot / live embed — production recording pending</p>
                    </div>
                    <div className="absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground font-semibold">
                      Step {tourStep + 1} — {step.title}
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <h2 className="text-lg font-bold text-foreground">{step.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-primary mb-1">Why this matters</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.highlight}</p>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-2">
                      <Button variant="outline" size="sm" disabled={tourStep === 0} onClick={() => setTourStep(s => s - 1)} className="gap-1.5 text-xs">
                        <ChevronLeft className="h-3.5 w-3.5" /> Previous
                      </Button>
                      <button onClick={() => setTourStep(s => Math.min(s + 1, TOUR_STEPS.length - 1))}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Skip →
                      </button>
                      {isLast ? (
                        <Button onClick={() => setShowCalendly(true)} className="gap-1.5 text-xs">
                          <Calendar className="h-3.5 w-3.5" /> Book 30-Min Demo
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => setTourStep(s => s + 1)} className="gap-1.5 text-xs">
                          Next <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Quick links */}
              <div className="text-center text-xs text-muted-foreground space-y-1">
                <p>Exploring on your own? Jump into the live product:</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => navigate('/portfolio')} className="text-primary hover:text-primary/80">Portfolio Dashboard</button>
                  <button onClick={() => navigate('/')} className="text-primary hover:text-primary/80">Workspace</button>
                  <button onClick={() => navigate('/clearance')} className="text-primary hover:text-primary/80">Clearance</button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Calendly Modal */}
      <AnimatePresence>
        {showCalendly && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-8 w-full max-w-md space-y-5 shadow-2xl text-center">
              <button onClick={() => setShowCalendly(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <Calendar className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-lg font-bold text-foreground">Book Your 30-Minute White-Glove Demo</h3>
              <p className="text-sm text-muted-foreground">
                A FlowAI specialist will walk through your specific portfolio, show the governance pipeline live on your products, and discuss enterprise pricing.
              </p>
              <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-6">
                <p className="text-xs text-muted-foreground font-semibold">Calendly embed</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Calendar integration to be configured — contact demo@veuaistudio.com to book now</p>
              </div>
              <a href="mailto:demo@veuaistudio.com?subject=FlowAI Enterprise Demo Request"
                className="block w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Email to Book →
              </a>
              <p className="text-[10px] text-muted-foreground">demo@veuaistudio.com · Response within 4 business hours</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DemoFooter />
    </div>
  );
}