import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2, ChevronRight, Sparkles, CheckCircle2, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DemoFlowGenerator({ productName: propName, description: propDesc }) {
  const [productName, setProductName] = useState(propName || '');
  const [description, setDescription] = useState(propDesc || '');
  const [loading, setLoading] = useState(false);
  const [flow, setFlow] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!productName.trim()) return;
    setLoading(true);
    setFlow(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate an interactive product demo flow for: ${productName}.
Description: ${description || 'A SaaS product'}
Return JSON with:
- title: demo title
- tagline: one-line hook
- steps: array of 5-7 steps, each with { step_number, title, description, action (what user clicks/does), outcome (what they see), wow_moment (boolean) }
- cta: final call to action text
- estimated_minutes: number`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            tagline: { type: 'string' },
            estimated_minutes: { type: 'number' },
            cta: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step_number: { type: 'number' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  action: { type: 'string' },
                  outcome: { type: 'string' },
                  wow_moment: { type: 'boolean' },
                },
              },
            },
          },
        },
      });
      setFlow(res);
      setActiveStep(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyScript = () => {
    if (!flow) return;
    const script = flow.steps.map(s => `Step ${s.step_number}: ${s.title}\n  Action: ${s.action}\n  Outcome: ${s.outcome}`).join('\n\n');
    navigator.clipboard.writeText(`${flow.title}\n${flow.tagline}\n\n${script}\n\nCTA: ${flow.cta}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Play className="h-4 w-4 text-emerald-400" /> Demo Flow Generator
      </h3>

      <div className="flex gap-2 flex-wrap">
        <Input value={productName} onChange={e => setProductName(e.target.value)}
          placeholder="Product name" className="h-8 text-xs flex-1 min-w-32" />
        <Input value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Brief description (optional)" className="h-8 text-xs flex-1 min-w-48" />
        <Button size="sm" onClick={generate} disabled={loading || !productName.trim()} className="h-8 gap-1.5 text-xs shrink-0">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Generate
        </Button>
      </div>

      <AnimatePresence>
        {flow && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">{flow.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{flow.tagline}</p>
                {flow.estimated_minutes && (
                  <span className="text-[10px] text-primary mt-1 inline-block">{flow.estimated_minutes} min demo</span>
                )}
              </div>
              <button onClick={copyScript}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border border-border hover:bg-secondary/50 transition-colors text-muted-foreground">
                {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy Script'}
              </button>
            </div>

            {/* Step progress */}
            <div className="flex gap-1.5 flex-wrap">
              {flow.steps?.map((s, i) => (
                <button key={i} onClick={() => setActiveStep(i)}
                  className={`h-6 w-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                    i === activeStep ? 'bg-primary text-primary-foreground' :
                    i < activeStep ? 'bg-emerald-500/20 text-emerald-400' : 'bg-secondary text-muted-foreground'
                  } ${s.wow_moment ? 'ring-1 ring-amber-400' : ''}`}>
                  {i < activeStep ? <CheckCircle2 className="h-3 w-3" /> : s.step_number}
                </button>
              ))}
            </div>

            {/* Active step */}
            {flow.steps?.[activeStep] && (
              <motion.div key={activeStep} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                className={`rounded-lg border p-4 space-y-2 ${flow.steps[activeStep].wow_moment ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-secondary/20'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-primary">Step {flow.steps[activeStep].step_number}</span>
                  {flow.steps[activeStep].wow_moment && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">✨ Wow Moment</span>}
                </div>
                <p className="text-sm font-bold text-foreground">{flow.steps[activeStep].title}</p>
                <p className="text-xs text-muted-foreground">{flow.steps[activeStep].description}</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded bg-secondary/40 p-2">
                    <p className="text-[9px] font-bold text-muted-foreground mb-0.5">USER DOES</p>
                    <p className="text-xs text-foreground">{flow.steps[activeStep].action}</p>
                  </div>
                  <div className="rounded bg-primary/5 border border-primary/20 p-2">
                    <p className="text-[9px] font-bold text-primary mb-0.5">THEY SEE</p>
                    <p className="text-xs text-foreground">{flow.steps[activeStep].outcome}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex gap-2 justify-between items-center">
              <Button variant="outline" size="sm" onClick={() => setActiveStep(Math.max(0, activeStep - 1))} disabled={activeStep === 0} className="h-7 text-xs">← Prev</Button>
              {activeStep < (flow.steps?.length || 0) - 1
                ? <Button size="sm" onClick={() => setActiveStep(activeStep + 1)} className="h-7 gap-1 text-xs">Next <ChevronRight className="h-3 w-3" /></Button>
                : <div className="text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {flow.cta}</div>
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}