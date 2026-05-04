import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2, CheckCircle2, Database, Code2, Layers, ArrowRight, Copy } from 'lucide-react';

const EXAMPLE_PRODUCTS = [
  { name: 'PressAI', desc: 'A SaaS platform for automating press release generation with user authentication, a dashboard, and AI-powered drafting tools.' },
  { name: 'InvoiceAI', desc: 'A SaaS invoicing tool for freelancers with client management, automated reminders, and Stripe payment integration.' },
  { name: 'ContentGenius', desc: 'An AI content creation platform for marketers with SEO optimization, multi-format output, and brand voice training.' },
];

const STEPS = ['Planning', 'Entity Schemas', 'UI Components', 'API Routes', 'Demo Data'];

export default function ProductGenerator() {
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);

  const handleGenerate = async () => {
    if (!productName.trim() || !description.trim()) return;
    setRunning(true);
    setResult(null);
    setError(null);
    setCurrentStep(0);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => prev < STEPS.length - 1 ? prev + 1 : prev);
    }, 1800);

    try {
      const res = await base44.functions.invoke('generateProduct', { name: productName, description });
      setResult(res?.data);
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(stepInterval);
      setCurrentStep(STEPS.length);
      setRunning(false);
    }
  };

  const copySection = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const applyExample = (ex) => {
    setProductName(ex.name);
    setDescription(ex.desc);
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Wand2 className="h-7 w-7 text-primary" />
          Product Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe your product and FlowAI will generate the full initial codebase, entity schemas, and demo data.
        </p>
      </motion.div>

      {/* Example Products */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center">Quick start:</span>
        {EXAMPLE_PRODUCTS.map(ex => (
          <button key={ex.name} onClick={() => applyExample(ex)}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-secondary/30 hover:bg-secondary/60 text-foreground transition-all">
            {ex.name}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Product Name</Label>
            <Input value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="e.g. PressAI" className="h-9 text-sm" disabled={running} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Product Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe your product, its core features, target audience, and any specific requirements..."
            className="min-h-24 text-sm resize-none" disabled={running} />
        </div>
        <Button onClick={handleGenerate} disabled={running || !productName.trim() || !description.trim()} className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {running ? 'Generating...' : 'Generate Product'}
        </Button>
      </div>

      {/* Step Progress */}
      {running && (
        <div className="flex items-center gap-2 flex-wrap">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full transition-all ${i <= currentStep ? 'bg-primary' : 'bg-secondary'}`} />
              <span className={`text-xs font-medium transition-colors ${i === currentStep ? 'text-primary' : i < currentStep ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                {step}
              </span>
              {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/30" />}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Summary */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-400">{result.name} — Generation Complete</p>
                <p className="text-xs text-muted-foreground mt-0.5">{result.summary}</p>
              </div>
            </div>

            {/* Entity Schemas */}
            {result.entities?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Entity Schemas ({result.entities.length})</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.entities.map((entity, i) => (
                    <div key={i} className="rounded-lg border border-border bg-secondary/20 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-primary">{entity.name}</p>
                        <button onClick={() => copySection(`entity-${i}`, JSON.stringify(entity.schema, null, 2))}
                          className="h-6 w-6 flex items-center justify-center hover:text-primary text-muted-foreground transition-colors">
                          {copiedSection === `entity-${i}` ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">{entity.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {entity.fields?.map(f => (
                          <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">{f}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* UI Components */}
            {result.components?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-purple-400" /> UI Components ({result.components.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.components.map((comp, i) => (
                    <div key={i} className="rounded-lg border border-border bg-secondary/20 p-3">
                      <p className="text-xs font-semibold text-foreground">{comp.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{comp.description}</p>
                      {comp.props?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {comp.props.map(p => (
                            <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Routes */}
            {result.api_routes?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Code2 className="h-4 w-4 text-orange-400" /> API Routes ({result.api_routes.length})</h3>
                <div className="space-y-2">
                  {result.api_routes.map((route, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 px-3 py-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${route.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : route.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400' : route.method === 'DELETE' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {route.method}
                      </span>
                      <span className="text-xs font-mono text-foreground">{route.path}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto truncate">{route.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {result.next_steps?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <h3 className="text-sm font-bold text-foreground">Next Steps</h3>
                {result.next_steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-primary font-bold shrink-0">{i + 1}.</span> {step}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}