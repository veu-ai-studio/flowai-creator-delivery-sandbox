import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Smartphone, CheckCircle2, AlertCircle, Loader2, Copy, Check,
  Apple, Globe, Download, FileText, ChevronDown, ChevronUp, Zap
} from 'lucide-react';

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-all">
      {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> {label}</>}
    </button>
  );
}

function Section({ title, icon: Icon, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-5 hover:bg-accent/20 transition-colors">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${color}`} />
          <span className="text-sm font-bold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChecklistItem({ label, done, onToggle }) {
  return (
    <button onClick={onToggle} className="flex items-start gap-3 text-left w-full group">
      <div className={`mt-0.5 h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-all ${done ? 'bg-emerald-500 border-emerald-500' : 'border-border group-hover:border-primary'}`}>
        {done && <Check className="h-2.5 w-2.5 text-white" />}
      </div>
      <span className={`text-xs leading-relaxed ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{label}</span>
    </button>
  );
}

export default function AppStoreDistribution() {
  const [productUrl, setProductUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [assets, setAssets] = useState(null);
  const [generatingAssets, setGeneratingAssets] = useState(false);
  const [appleChecklist, setAppleChecklist] = useState({});
  const [googleChecklist, setGoogleChecklist] = useState({});

  const APPLE_ITEMS = [
    'App name and subtitle filled in App Store Connect',
    'Primary category selected',
    'App Store description written (up to 4000 characters)',
    'Keywords filled (up to 100 characters)',
    'Support URL provided',
    'Privacy policy URL provided and live',
    'Age rating questionnaire completed',
    '6.7-inch screenshots uploaded (iPhone 14 Pro Max)',
    '6.5-inch screenshots uploaded (iPhone 11 Pro Max)',
    '5.5-inch screenshots uploaded (iPhone 8 Plus)',
    'iPad Pro (12.9-inch) screenshots uploaded',
    'App Store Review Guidelines compliance verified',
    'Binary uploaded and reviewed',
  ];

  const GOOGLE_ITEMS = [
    'App title filled in Google Play Console',
    'Short description written (up to 80 characters)',
    'Full description written (up to 4000 characters)',
    'Content rating questionnaire completed',
    'Privacy policy URL provided',
    'Feature graphic uploaded (1024x500px)',
    'Phone screenshots uploaded (minimum 2)',
    'Tablet screenshots uploaded (optional but recommended)',
    'App signing configured',
    'Data safety form completed',
    'Target audience and content settings configured',
    'APK or AAB uploaded',
  ];

  const runEligibilityCheck = async () => {
    if (!productUrl.trim() && !productName.trim()) return;
    setLoading(true);
    setEligibility(null);
    setAssets(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's App Store eligibility checker.

Product: ${productName || 'Unknown'}
URL: ${productUrl || 'N/A'}

Assess this product for App Store distribution eligibility. Check:
1. Mobile-responsive design — does the URL/description suggest mobile-friendly design?
2. Privacy policy — is a privacy policy URL mentioned or implied?
3. Age rating information — can we determine appropriate age rating from the product?
4. Accessibility — are there basic accessibility signals?
5. Content compliance — does the product content appear to meet Apple and Google content policies?

Return JSON: {
  "eligible": true|false,
  "score": 0-100,
  "checks": [
    {"name": "Mobile Responsive Design", "status": "pass"|"fail"|"unknown", "note": "one sentence"},
    {"name": "Privacy Policy", "status": "pass"|"fail"|"unknown", "note": "one sentence"},
    {"name": "Age Rating Clarity", "status": "pass"|"fail"|"unknown", "note": "one sentence"},
    {"name": "Accessibility Signals", "status": "pass"|"fail"|"unknown", "note": "one sentence"},
    {"name": "Content Policy Compliance", "status": "pass"|"fail"|"unknown", "note": "one sentence"}
  ],
  "summary": "two sentence eligibility assessment",
  "recommended_category_apple": "string",
  "recommended_category_google": "string",
  "recommended_age_rating": "4+" | "9+" | "12+" | "17+"
}`,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          eligible: { type: 'boolean' },
          score: { type: 'number' },
          checks: { type: 'array', items: { type: 'object' } },
          summary: { type: 'string' },
          recommended_category_apple: { type: 'string' },
          recommended_category_google: { type: 'string' },
          recommended_age_rating: { type: 'string' },
        }
      }
    });
    setEligibility(typeof res === 'object' ? res : JSON.parse(res));
    setLoading(false);
  };

  const generateAssets = async () => {
    if (!productName.trim()) return;
    setGeneratingAssets(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's App Store asset generator.

Product: ${productName}
URL: ${productUrl || 'N/A'}
Category: ${eligibility?.recommended_category_apple || 'Productivity'}

Generate ready-to-use App Store and Google Play text assets for ${productName}.

Return JSON: {
  "apple_title": "string (max 30 chars)",
  "apple_subtitle": "string (max 30 chars)",
  "apple_description": "string (up to 4000 chars — compelling, feature-rich description)",
  "apple_keywords": "string (comma-separated, max 100 chars total)",
  "google_title": "string (max 50 chars)",
  "google_short_description": "string (max 80 chars)",
  "google_full_description": "string (up to 4000 chars)",
  "privacy_policy_placeholder": "string (suggested privacy policy URL format)",
  "support_url_placeholder": "string"
}`,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          apple_title: { type: 'string' },
          apple_subtitle: { type: 'string' },
          apple_description: { type: 'string' },
          apple_keywords: { type: 'string' },
          google_title: { type: 'string' },
          google_short_description: { type: 'string' },
          google_full_description: { type: 'string' },
          privacy_policy_placeholder: { type: 'string' },
          support_url_placeholder: { type: 'string' },
        }
      }
    });
    setAssets(typeof res === 'object' ? res : JSON.parse(res));
    setGeneratingAssets(false);
  };

  const downloadAssets = () => {
    if (!assets) return;
    const text = `APP STORE DISTRIBUTION ASSETS — ${productName}
Generated by FlowAI

═══════════════════════════════════════
APPLE APP STORE
═══════════════════════════════════════
App Title (max 30 chars):
${assets.apple_title}

App Subtitle (max 30 chars):
${assets.apple_subtitle}

Keywords (max 100 chars):
${assets.apple_keywords}

App Store Description (up to 4000 chars):
${assets.apple_description}

Support URL:
${assets.support_url_placeholder}

═══════════════════════════════════════
GOOGLE PLAY STORE
═══════════════════════════════════════
App Title (max 50 chars):
${assets.google_title}

Short Description (max 80 chars):
${assets.google_short_description}

Full Description (up to 4000 chars):
${assets.google_full_description}

Privacy Policy URL:
${assets.privacy_policy_placeholder}
`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${productName.replace(/\s+/g, '-').toLowerCase()}-app-store-assets.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleApple = (item) => setAppleChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  const toggleGoogle = (item) => setGoogleChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  const appleProgress = APPLE_ITEMS.filter(i => appleChecklist[i]).length;
  const googleProgress = GOOGLE_ITEMS.filter(i => googleChecklist[i]).length;

  return (
    <div className="p-6 lg:p-10 max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Smartphone className="h-7 w-7 text-primary" /> App Store Distribution
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Guide your product through Apple App Store and Google Play Store submission
        </p>
      </motion.div>

      {/* Product input */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Product Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Product Name *</label>
            <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. SAIGE" className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Product URL</label>
            <Input value={productUrl} onChange={e => setProductUrl(e.target.value)} placeholder="https://your-product.com" className="h-9" />
          </div>
        </div>
        <Button onClick={runEligibilityCheck} disabled={loading || (!productUrl.trim() && !productName.trim())} className="gap-2 w-full sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Run Eligibility Check
        </Button>
      </div>

      {/* Section 1: Eligibility */}
      {eligibility && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Section title="Section 1 — Eligibility Check" icon={CheckCircle2} color={eligibility.eligible ? 'text-emerald-400' : 'text-red-400'} defaultOpen>
            <div className={`rounded-lg border p-4 ${eligibility.eligible ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="flex items-center gap-3 mb-3">
                {eligibility.eligible
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  : <AlertCircle className="h-5 w-5 text-red-400" />}
                <div>
                  <p className={`text-sm font-bold ${eligibility.eligible ? 'text-emerald-400' : 'text-red-400'}`}>
                    {eligibility.eligible ? `Eligible for App Store Distribution (Score: ${eligibility.score}/100)` : `Not Yet Eligible (Score: ${eligibility.score}/100)`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{eligibility.summary}</p>
                </div>
              </div>
              <div className="space-y-2">
                {(eligibility.checks || []).map((check, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {check.status === 'pass'
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      : check.status === 'fail'
                      ? <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                      : <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />}
                    <div>
                      <span className="font-semibold text-foreground">{check.name}:</span>
                      <span className="text-muted-foreground ml-1">{check.note}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-3">
                {eligibility.recommended_category_apple && <span>Apple Category: <span className="text-foreground font-semibold">{eligibility.recommended_category_apple}</span></span>}
                {eligibility.recommended_category_google && <span>Google Category: <span className="text-foreground font-semibold">{eligibility.recommended_category_google}</span></span>}
                {eligibility.recommended_age_rating && <span>Age Rating: <span className="text-foreground font-semibold">{eligibility.recommended_age_rating}</span></span>}
              </div>
            </div>
          </Section>
        </motion.div>
      )}

      {/* Section 2: Apple App Store */}
      {eligibility && (
        <Section title="Section 2 — Apple App Store Submission" icon={Apple} color="text-foreground" defaultOpen>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Progress: {appleProgress}/{APPLE_ITEMS.length} items complete</p>
            <div className="h-1.5 w-32 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(appleProgress / APPLE_ITEMS.length) * 100}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            {APPLE_ITEMS.map(item => (
              <ChecklistItem key={item} label={item} done={!!appleChecklist[item]} onToggle={() => toggleApple(item)} />
            ))}
          </div>
        </Section>
      )}

      {/* Section 3: Google Play */}
      {eligibility && (
        <Section title="Section 3 — Google Play Store Submission" icon={Globe} color="text-emerald-400">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Progress: {googleProgress}/{GOOGLE_ITEMS.length} items complete</p>
            <div className="h-1.5 w-32 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(googleProgress / GOOGLE_ITEMS.length) * 100}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            {GOOGLE_ITEMS.map(item => (
              <ChecklistItem key={item} label={item} done={!!googleChecklist[item]} onToggle={() => toggleGoogle(item)} />
            ))}
          </div>
        </Section>
      )}

      {/* Section 4: Generated Assets */}
      {eligibility && (
        <Section title="Section 4 — Generated Assets" icon={FileText} color="text-primary">
          {!assets && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">FlowAI will generate ready-to-use titles, descriptions, and keywords for both stores based on your product.</p>
              <Button onClick={generateAssets} disabled={generatingAssets || !productName.trim()} className="gap-2 w-full sm:w-auto">
                {generatingAssets ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Generate Store Assets
              </Button>
            </div>
          )}
          {generatingAssets && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Generating App Store and Google Play assets…
            </div>
          )}
          {assets && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button onClick={downloadAssets} variant="outline" className="gap-2 text-xs h-9">
                  <Download className="h-3.5 w-3.5" /> Download All Assets (.txt)
                </Button>
                <Button onClick={generateAssets} variant="ghost" disabled={generatingAssets} className="gap-2 text-xs h-9">
                  Regenerate
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-foreground uppercase tracking-wide">Apple App Store</p>
                {[
                  { label: 'App Title (max 30 chars)', value: assets.apple_title, chars: 30 },
                  { label: 'App Subtitle (max 30 chars)', value: assets.apple_subtitle, chars: 30 },
                  { label: 'Keywords (max 100 chars)', value: assets.apple_keywords, chars: 100 },
                ].map(f => (
                  <div key={f.label} className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">{f.label}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] ${(f.value || '').length > f.chars ? 'text-red-400' : 'text-muted-foreground'}`}>
                          {(f.value || '').length}/{f.chars}
                        </span>
                        <CopyBtn text={f.value || ''} />
                      </div>
                    </div>
                    <p className="text-xs text-foreground">{f.value}</p>
                  </div>
                ))}
                <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">App Store Description</p>
                    <CopyBtn text={assets.apple_description || ''} />
                  </div>
                  <pre className="text-xs text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">{assets.apple_description}</pre>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-foreground uppercase tracking-wide">Google Play Store</p>
                {[
                  { label: 'App Title (max 50 chars)', value: assets.google_title, chars: 50 },
                  { label: 'Short Description (max 80 chars)', value: assets.google_short_description, chars: 80 },
                ].map(f => (
                  <div key={f.label} className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">{f.label}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] ${(f.value || '').length > f.chars ? 'text-red-400' : 'text-muted-foreground'}`}>
                          {(f.value || '').length}/{f.chars}
                        </span>
                        <CopyBtn text={f.value || ''} />
                      </div>
                    </div>
                    <p className="text-xs text-foreground">{f.value}</p>
                  </div>
                ))}
                <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">Full Description</p>
                    <CopyBtn text={assets.google_full_description || ''} />
                  </div>
                  <pre className="text-xs text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">{assets.google_full_description}</pre>
                </div>
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}