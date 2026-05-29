import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Rocket, Loader2, CheckCircle2, Globe, Megaphone,
  Play, ExternalLink, Copy, Users
} from 'lucide-react';
import GTMLaunchChecklist from '@/components/gtm/GTMLaunchChecklist';
import DemoFlowGenerator from '@/components/gtm/DemoFlowGenerator';
import TeamFeedbackModule from '@/components/shared/TeamFeedbackModule';

const GTM_MODES = [
  { key: 'landing',  label: 'Landing Page',   icon: Globe,      color: 'text-blue-400',   desc: 'Conversion-optimized landing page deployed live' },
  { key: 'copy',     label: 'Marketing Copy',  icon: Megaphone,  color: 'text-purple-400', desc: 'Headlines, CTAs, email sequences & ad copy' },
  { key: 'demo',     label: 'Interactive Demo',icon: Play,       color: 'text-emerald-400',desc: 'Pre-populated demo environment with guided tour' },
];

export default function GTMEngine() {
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [selectedModes, setSelectedModes] = useState(['landing', 'copy', 'demo']);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const toggleMode = (key) => setSelectedModes(prev =>
    prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
  );

  const copy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRun = async () => {
    if (!productName.trim() || !description.trim()) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await base44.functions.invoke('gtmEngine', {
        name: productName, description, target_audience: targetAudience, modes: selectedModes
      });
      setResult(res?.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Rocket className="h-7 w-7 text-primary" />
          GTM Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Autonomously generate landing pages, marketing copy, and interactive demos to get your product to market fast.
        </p>
      </motion.div>

      {/* Mode Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {GTM_MODES.map(({ key, label, icon: Icon, color, desc }) => (
          <button key={key} onClick={() => toggleMode(key)}
            className={`rounded-xl border p-4 text-left transition-all ${selectedModes.includes(key) ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:bg-secondary/20'}`}>
            <Icon className={`h-5 w-5 mb-2 ${color}`} />
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Product Name</Label>
            <Input value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="e.g. PressAI" className="h-9 text-sm" disabled={running} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Target Audience</Label>
            <Input value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
              placeholder="e.g. PR professionals, startups" className="h-9 text-sm" disabled={running} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Product Description & Key Features</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe your product, its unique value proposition, and core features..."
            className="min-h-20 text-sm resize-none" disabled={running} />
        </div>
        <Button onClick={handleRun} disabled={running || !productName.trim() || !description.trim() || selectedModes.length === 0} className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          {running ? 'Generating GTM Assets...' : 'Launch GTM Engine'}
        </Button>
      </div>

      {/* GTM Launch Checklist */}
      <GTMLaunchChecklist />

      {/* Demo Flow Generator */}
      <DemoFlowGenerator productName={productName} description={description} />

      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Landing Page */}
            {result.landing_page && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" /> Landing Page
                  {result.landing_page.deployed_url && (
                    <a href={result.landing_page.deployed_url} target="_blank" rel="noopener noreferrer"
                      className="ml-auto text-xs text-primary flex items-center gap-1 hover:underline">
                      View Live <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['headline', 'subheadline', 'cta'].map(field => (
                    <div key={field} className="rounded-lg border border-border bg-secondary/20 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-1">{field.replace('_', ' ')}</p>
                      <p className="text-xs text-foreground font-medium">{result.landing_page[field]}</p>
                    </div>
                  ))}
                </div>
                {result.landing_page.sections?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Page Sections</p>
                    <div className="flex flex-wrap gap-2">
                      {result.landing_page.sections.map(s => (
                        <span key={s} className="text-[10px] px-2 py-1 rounded border border-border bg-secondary/30 text-foreground">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Marketing Copy */}
            {result.marketing_copy && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-purple-400" /> Marketing Copy
                </h3>
                <div className="space-y-3">
                  {Object.entries(result.marketing_copy).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-border bg-secondary/20 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{key.replace(/_/g, ' ')}</p>
                        <button onClick={() => copy(key, Array.isArray(value) ? value.join('\n') : value)}
                          className="h-5 w-5 flex items-center justify-center hover:text-primary text-muted-foreground transition-colors">
                          {copiedKey === key ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                      {Array.isArray(value)
                        ? <ul className="space-y-1">{value.map((v, i) => <li key={i} className="text-xs text-foreground">• {v}</li>)}</ul>
                        : <p className="text-xs text-foreground">{value}</p>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Demo */}
            {result.demo && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-400" /> Interactive Demo
                  {result.demo.url && (
                    <a href={result.demo.url} target="_blank" rel="noopener noreferrer"
                      className="ml-auto text-xs text-primary flex items-center gap-1 hover:underline">
                      Launch Demo <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </h3>
                {result.demo.tour_steps?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Guided Tour Steps</p>
                    {result.demo.tour_steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="text-foreground mt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>
                )}
                {result.demo.sample_data_summary && (
                  <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">{result.demo.sample_data_summary}</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Feedback */}
      <TeamFeedbackModule context="gtm" />
    </div>
  );
}