import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UniversalNav from '@/components/shared/UniversalNav';
import { motion } from 'framer-motion';
import { Zap, Shield, RefreshCw, Activity, ArrowRight, Lock, Globe, Users } from 'lucide-react';

export default function MarketingPage() {
  const navigate = useNavigate();

  // Global paste fix for all inputs on this page
  useEffect(() => {
    const handlePaste = (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const text = e.clipboardData.getData('text/plain');
        if (text) {
          e.preventDefault();
          const proto = target.tagName === 'INPUT'
            ? window.HTMLInputElement.prototype
            : window.HTMLTextAreaElement.prototype;
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value').set;
          nativeInputValueSetter.call(target, target.value + text);
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    };
    document.addEventListener('paste', handlePaste, true);
    return () => document.removeEventListener('paste', handlePaste, true);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-inter">

      {/* ── HEADER ── */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground leading-tight">FlowAI</div>
              <div className="text-[10px] text-muted-foreground leading-tight">VEU AI Studio</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UniversalNav />
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary font-semibold mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            VEU AI Studio Internal Platform
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
            The Infrastructure Behind<br />VEU AI Studio
          </h1>
          <p className="mt-6 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            FlowAI is the proprietary, human-controlled operations engine that governs, tests,
            heals, and launches every VEU AI Studio product — from research through clearance.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <Zap className="h-4 w-4" /> Open Command Center
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:border-primary/30 transition-colors"
            >
              Dashboard <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── CORE CAPABILITIES ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide text-center mb-10">Core Capabilities</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Self-Renewal Engine</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Autonomous four-phase governance cycle — Self-Test, Self-Heal, Self-Optimize, Human Gate — runs on any Base44 product with a single sprint install.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Self-Protection Layer</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Anti-crawling bot detection, content protection, IP notice footer, and demo environment disclaimer — installs across all five VEU AI Studio products in minutes.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-foreground">8-Step Operations Pipeline</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Research → Design → Build → QA Audit → Deploy → Self-Renewal → Go To Market → Monitor. Run in Auto, Guided, or Manual mode with full audit trail.
              </p>
            </div>

          </div>
        </motion.div>
      </section>

      {/* ── PARTNERSHIP CTA ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-10 text-center space-y-6">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">Internal Use Only</span>
              </div>
              <span className="text-muted-foreground">·</span>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">VEU AI Studio Network</span>
              </div>
              <span className="text-muted-foreground">·</span>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Supervised Access</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Built for the VEU AI Studio Portfolio</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              FlowAI governs SAIGE, PressAI, RelTwin, ReachSMS, and MyPregLife — from creation through clearance. 
              Capability packages transfer governance infrastructure to each product with a single Base44 sprint.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                <Zap className="h-4 w-4" /> Enter FlowAI
              </button>
              <button
                onClick={() => navigate('/capability-transfer')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:border-primary/30 transition-colors"
              >
                Capability Transfer <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-8 px-6 mt-4">
        <div className="max-w-5xl mx-auto text-center space-y-2">
          <p className="text-[11px] text-muted-foreground">
            FlowAI is proprietary technology of VEU AI Studio. Unauthorized access, scraping, reverse engineering, or redistribution is prohibited.
          </p>
          <p className="text-[11px] text-muted-foreground">
            © 2026 VEU AI Studio. All rights reserved. Patent pending.
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <button onClick={() => navigate('/terms-of-use')} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Terms of Use</button>
            <button onClick={() => navigate('/privacy-policy')} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</button>
          </div>
        </div>
      </footer>

    </div>
  );
}