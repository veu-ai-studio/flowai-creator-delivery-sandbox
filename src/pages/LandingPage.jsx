import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Zap, Clock, Wrench, Link2, Pencil, Clipboard, Mic, MicOff,
  XCircle, Loader2, UploadCloud, ChevronRight,
  Layers, History, ShieldCheck, BookOpen, BarChart3, X, GitBranch, Sparkles
} from 'lucide-react';
import { saveSessionConfig } from './Configuration';
import RunConstructionPanel from '@/components/RunConstructionPanel';
import { findRegisteredProductConfigForUrl } from '@/lib/products/registeredProductConfig';
import {
  ANALYSIS_DEPTH_OPTIONS,
  analysisDepthLabel,
  analysisDepthValue,
  flowHubPathFromPathname,
  flowHubPathOption,
  normalizeFlowHubAxes,
  readStoredFlowHubAxes,
  writeStoredFlowHubAxes,
} from '@/lib/flowHubAxes';

const SPEECH_SUPPORTED = typeof window !== 'undefined' &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

const OBJECTIVES = [
  { value: 'audit_demo',       label: 'Audit for prospect demo readiness' },
  { value: 'investor_review',  label: 'Prepare for investor review' },
  { value: 'full_governance',  label: 'Full governance and clearance cycle' },
  { value: 'compare',          label: 'Compare two or more products' },
  { value: 'combine',          label: 'Combine inputs into a unified specification' },
  { value: 'benchmark',        label: 'Benchmark against competitors' },
  { value: 'launch_readiness', label: 'Launch readiness check' },
  { value: 'custom',           label: 'Custom — I will describe my objective' },
];

const DEPTHS = ANALYSIS_DEPTH_OPTIONS.map((option) => option.label);
const MIGRATION_MODE_ENABLED_FOR_UI =
  String(import.meta.env?.VITE_FLOWAI_ENABLE_MIGRATION_MODE || '').toLowerCase() === 'true';
const FRESH_BUILD_ENABLED_FOR_UI =
  String(import.meta.env?.VITE_FLOWAI_ENABLE_FRESH_BUILD || '').toLowerCase() === 'true';
const FLOWAI_OPERATOR_NAME = import.meta.env?.VITE_FLOWAI_OPERATOR_NAME || 'FlowAI operator';
const FLOWAI_OPERATOR_EMAIL = import.meta.env?.VITE_FLOWAI_OPERATOR_EMAIL || '';
const URL_FORMAT_VALID_MESSAGE = 'URL format valid — forge will attempt live crawl and stop if unreachable.';
const URL_HARD_BLOCK_MESSAGE = 'Hard block — this URL is not allowed by the client-side URL safety screen.';
const URL_INVALID_SCHEME_MESSAGE = 'Invalid scheme — enter an http(s) URL.';

const DESCRIPTION_TEMPLATE = `Product Name: 
What it does: 
Target audience: 
Key features: 
Current known issues: 
Live URL (optional): 
Login email (optional — for authenticated testing): 
Login password (optional — for authenticated testing): `;

export function evaluateClientUrlSafety(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return { status: 'empty', message: '', launchBlocked: false };

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { status: 'invalid', message: URL_INVALID_SCHEME_MESSAGE, launchBlocked: true };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { status: 'invalid', message: URL_INVALID_SCHEME_MESSAGE, launchBlocked: true };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const localhostBlocked =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '::1' ||
    host === '0:0:0:0:0:0:0:1';
  const octets = host.split('.');
  const isIpv4 = octets.length === 4 && octets.every(part => /^\d+$/.test(part));
  const privateIpv4Blocked = isIpv4 && (() => {
    const [a, b, c, d] = octets.map(Number);
    const validOctets = [a, b, c, d].every(n => Number.isInteger(n) && n >= 0 && n <= 255);
    if (!validOctets) return true;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  })();

  if (localhostBlocked || privateIpv4Blocked) {
    return { status: 'blocked', message: URL_HARD_BLOCK_MESSAGE, launchBlocked: true };
  }

  return { status: 'valid', message: URL_FORMAT_VALID_MESSAGE, launchBlocked: false };
}

export function resolveRunConstructionMode({
  mode,
  operationalMode,
  structuralLayer = 'autonomous',
  isMigrationMode = false,
  isFreshBuildMode = false,
  inngestReady = false,
} = {}) {
  if (isMigrationMode) return 'MIGRATION';
  if (isFreshBuildMode) return 'FRESH_BUILD';
  const effectiveMode = String(operationalMode ?? mode ?? 'auto').trim().toLowerCase();
  const effectiveLayer = String(structuralLayer ?? 'autonomous').trim().toLowerCase().replace(/-/g, '_');
  if (effectiveLayer === 'controlled' || effectiveMode === 'manual') return 'MANUAL';
  if (effectiveLayer === 'supervised' || effectiveMode === 'guided') return 'GUIDED';
  if (effectiveMode === 'auto' && inngestReady === true) return 'BACKGROUND';
  return 'FOREGROUND';
}

function detectMigrationPlatformHint({ url = '', description = '', productConfig = null } = {}) {
  const haystack = `${url}\n${description}\n${productConfig?.systemNote || ''}`.toLowerCase();
  if (haystack.includes('base44')) return 'Base44';
  if (haystack.includes('wix')) return 'Wix';
  if (haystack.includes('webflow')) return 'Webflow';
  if (haystack.includes('bubble')) return 'Bubble';
  if (haystack.includes('wordpress') || haystack.includes('wp-json')) return 'WordPress';
  return productConfig ? 'Pending source scan' : 'Enter a URL to detect';
}

function estimateMigrationFiles(productConfig) {
  if (!productConfig) return 'Pending registry match';
  if (productConfig.platform_dependency_files) return String(productConfig.platform_dependency_files);
  if (productConfig.name === 'SAIGE') return '273 flagged platform-dependent files';
  return 'Pending source scan';
}

// Crawler quality dot indicator
function CrawlerQualityDot({ quality }) {
  const MAP = {
    full:  { color: 'bg-emerald-400', label: 'Full browser crawl' },
    basic: { color: 'bg-amber-400',   label: 'Basic crawl' },
    none:  { color: 'bg-muted-foreground/40', label: 'No crawl data' },
  };
  // Defense-in-depth: any unknown quality value (e.g. a backend that
  // emits a fresh tier name we don't yet render) falls back to the
  // 'none' tile instead of crashing the page with "undefined.label".
  const cfg = MAP[quality || 'none'] || MAP.none;
  return (
    <span title={`Crawler quality: ${cfg.label}`}
      className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
      <span className={`h-2 w-2 rounded-full ${cfg.color}`} />
      <span className="hidden sm:inline">{cfg.label}</span>
    </span>
  );
}

// ─── CARD A — URL ─────────────────────────────────────────────────────────────
function FocusedMigrationSetup({
  urlInput,
  setUrlInput,
  description,
  setDescription,
  setActiveCard,
  setFlowHubPath,
  runPanelUrl,
  setRunPanelUrl,
  migrationModeEnabled,
  migrationFlagBusy,
  migrationFlagError,
  setMigrationModeRuntimeFlag,
  userIsOperator,
  operatorContact,
  operatorSecret,
  setOperatorSecret,
  detectedPlatform,
  upgradeTarget,
  estimatedFiles,
  structuralLayer,
  operationalMode,
  analysisDepth,
  flowHubPath,
}) {
  return (
    <div className="min-h-screen bg-background text-foreground font-inter">
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
              <GitBranch className="h-4 w-4 text-cyan-300" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground leading-tight">Flow Hub — Migration</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Flow Hub platform dependency migration setup.</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {runPanelUrl ? (
          <RunConstructionPanel
            url={runPanelUrl}
            mode="MIGRATION"
            operationalMode={operationalMode}
            structuralLayer={structuralLayer}
            analysisDepth={analysisDepth}
            flowHubPath={flowHubPath}
            autoStart
            onClose={() => setRunPanelUrl(null)}
            operatorSecret={operatorSecret}
            setOperatorSecret={setOperatorSecret}
          />
        ) : (
          <>
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Step 1 - Select Your Product</p>
                <h1 className="mt-1 text-lg font-bold text-foreground">Which product do you want to migrate?</h1>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Input
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setActiveCard('A'); }}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text/plain');
                    if (text) {
                      e.preventDefault();
                      setUrlInput(text.trim());
                      setActiveCard('A');
                    }
                  }}
                  data-paste-behavior="replace"
                  aria-label="Product URL to migrate"
                  placeholder="Enter product URL — e.g. https://saigeplatform.com"
                  className="h-12 text-base font-mono border-cyan-500/60 bg-cyan-500/5 ring-1 ring-cyan-500/20 placeholder:text-cyan-100/45 focus-visible:ring-cyan-400"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional: describe migration goals, known platform dependencies, or constraints..."
                  rows={4}
                  className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </motion.section>

            {urlInput.trim() && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Step 2 - Migration Details</p>
                  <h2 className="mt-1 text-base font-bold text-foreground">Migration plan preview</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border bg-background/60 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Platform detected</p>
                    <p className="mt-1 text-foreground font-semibold">{detectedPlatform}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background/60 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Upgrade repo target</p>
                    <p className="mt-1 text-foreground font-semibold break-all">{upgradeTarget}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background/60 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Estimated files to migrate</p>
                    <p className="mt-1 text-foreground font-semibold">{estimatedFiles}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-300">Rollback</p>
                    <p className="mt-1 text-emerald-100 font-semibold">Original stays frozen as rollback.</p>
                  </div>
                </div>
              </motion.section>
            )}

            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Step 3 - Confirm and Start</p>
                <h2 className="mt-1 text-base font-bold text-foreground">Migration execution</h2>
              </div>

              {migrationModeEnabled ? (
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Migration Mode enabled.</span> FlowAI will migrate only the upgrade target.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setMigrationModeRuntimeFlag(false)}
                      disabled={migrationFlagBusy}
                    >
                      {migrationFlagBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Disable
                    </Button>
                    <Button
                      onClick={() => { setFlowHubPath('migration'); setActiveCard('A'); setRunPanelUrl(urlInput.trim()); }}
                      disabled={!urlInput.trim()}
                      className="gap-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                      Start Migration
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                  <p className="text-sm font-semibold text-amber-100">Migration Mode is currently disabled.</p>
                  {userIsOperator ? (
                    <Button
                      type="button"
                      onClick={() => setMigrationModeRuntimeFlag(true)}
                      disabled={migrationFlagBusy}
                      className="gap-2"
                    >
                      {migrationFlagBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                      Enable Migration Mode
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-amber-100 leading-relaxed">
                        Migration Mode requires operator activation. Contact {operatorContact} to enable it.
                      </p>
                      <div className="space-y-2">
                        <Input
                          type="password"
                          value={operatorSecret}
                          onChange={(e) => setOperatorSecret(e.target.value)}
                          placeholder="Emergency operator secret"
                          autoComplete="off"
                          className="h-9 text-xs"
                        />
                        <Button
                          type="button"
                          onClick={() => setMigrationModeRuntimeFlag(true)}
                          disabled={migrationFlagBusy || !operatorSecret.trim()}
                          className="gap-2"
                        >
                          {migrationFlagBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                          Enable with Operator Secret
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {migrationFlagError && (
                <p className="text-xs text-red-300">{migrationFlagError}</p>
              )}
            </motion.section>
          </>
        )}
      </main>
    </div>
  );
}

function CardA({ active, onActivate, url, setUrl, fetchStatus, setFetchStatus, onTestFetch, testing, crawlerQuality }) {
  const liveSafety = evaluateClientUrlSafety(url);
  const shownStatus = liveSafety.launchBlocked ? liveSafety.status : fetchStatus;
  const shownMessage = liveSafety.launchBlocked ? liveSafety.message : URL_FORMAT_VALID_MESSAGE;
  return (
    <div
      onClick={onActivate}
      className={`rounded-xl border p-5 cursor-pointer transition-all space-y-3 ${
        active ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:border-primary/30 opacity-80'
      }`}
    >
      <div className="flex items-center gap-2">
        <Link2 className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className={`text-sm font-bold ${active ? 'text-primary' : 'text-foreground'}`}>Analyze a Live Product</p>
        {active && <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">SELECTED</span>}
      </div>
      <p className="text-[11px] text-muted-foreground">FlowAI will fetch and analyze the public-facing pages of your product.</p>

      <div className="flex gap-2 items-center">
        <Input
          value={url}
          onChange={e => { onActivate(); setUrl(e.target.value); setFetchStatus(null); }}
          onPaste={e => { e.stopPropagation(); const t = e.clipboardData.getData('text/plain'); e.preventDefault(); onActivate(); setUrl(t); setFetchStatus(null); }}
          onClick={e => { e.stopPropagation(); onActivate(); }}
          placeholder="Enter your product URL..."
          className="h-9 text-sm flex-1"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-9 text-xs shrink-0 gap-1.5"
          onClick={e => { e.stopPropagation(); onTestFetch(); }}
          disabled={!url.trim() || testing}
        >
          {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          Test Fetch
        </Button>
        {fetchStatus === 'ok' && crawlerQuality && (
          <CrawlerQualityDot quality={crawlerQuality} />
        )}
      </div>

      {/* Fetch result */}
      <AnimatePresence>
        {shownStatus === 'valid' && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" /> {shownMessage}
          </motion.div>
        )}
        {shownStatus === 'blocked' && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-red-400 text-xs font-semibold">
            <XCircle className="h-3.5 w-3.5" /> {shownMessage}
          </motion.div>
        )}
        {shownStatus === 'invalid' && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
            <XCircle className="h-3.5 w-3.5" /> {liveSafety.message || URL_INVALID_SCHEME_MESSAGE}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[10px] text-amber-400">Note: URL must be publicly accessible. Authenticated or private apps use Card B or C.</p>
    </div>
  );
}

// ─── CARD B — DESCRIBE ────────────────────────────────────────────────────────
function CardB({ active, onActivate, description, setDescription, setUrlInput, products, loadingProducts }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const productList = Array.isArray(products) ? products.filter((product) => product && typeof product === 'object') : [];

  const toggleVoice = (e) => {
    e.stopPropagation();
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'en-US';
    r.onresult = (ev) => setDescription(prev => prev + ev.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
    r.start();
    setListening(true);
  };

  const loadProduct = (e, product) => {
    e.stopPropagation();
    const productUrl = product.live_url || product.url || product.base44_url || product.product_url || product.domain || '';
    if (productUrl) setUrlInput(productUrl.startsWith('http') ? productUrl : `https://${productUrl}`);
    setDescription(
      `Product Name: ${product.product_name || product.name || ''}\nWhat it does: ${product.description || ''}\nTarget audience: ${product.target_audience || ''}\nKey features: \nCurrent known issues: \nLive URL (optional): ${productUrl}`
    );
  };

  return (
    <div
      onClick={onActivate}
      className={`rounded-xl border p-5 cursor-pointer transition-all space-y-3 ${
        active ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:border-primary/30 opacity-80'
      }`}
    >
      <div className="flex items-center gap-2">
        <Pencil className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className={`text-sm font-bold ${active ? 'text-primary' : 'text-foreground'}`}>Describe Your Product</p>
        {active && <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">SELECTED</span>}
      </div>
      <p className="text-[11px] text-muted-foreground">Type or speak a description. Best for authenticated apps, internal tools, or early-stage products.</p>

      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        onPaste={e => { e.stopPropagation(); const t = e.clipboardData.getData('text/plain'); e.preventDefault(); setDescription(prev => prev + t); }}
        onClick={e => { e.stopPropagation(); onActivate(); }}
        placeholder={DESCRIPTION_TEMPLATE}
        rows={7}
        className="w-full text-xs bg-background border border-input rounded-md px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring font-mono"
      />

      <p className="text-[10px] text-muted-foreground/60 italic">
        🔒 Credentials are used only for this session and are never stored.
      </p>

      <div className="flex gap-2 items-center flex-wrap">
        {SPEECH_SUPPORTED && (
          <button
            onClick={toggleVoice}
            className={`flex items-center gap-1 text-[11px] h-7 px-2.5 rounded border transition-all font-semibold ${
              listening
                ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {listening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
            {listening ? 'Stop' : 'Voice Input'}
          </button>
        )}

        {/* Load from My Products */}
        {!loadingProducts && productList.length > 0 && (
          <div className="relative group">
            <button
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] h-7 px-2.5 rounded border border-border text-muted-foreground hover:text-foreground font-semibold transition-all"
            >
              <Layers className="h-3 w-3" /> Load from My Products ▾
            </button>
            <div className="absolute top-8 left-0 z-20 bg-card border border-border rounded-lg shadow-lg p-1 min-w-48 hidden group-hover:block">
              {productList.map(p => (
                <button
                  key={p.id}
                  onClick={e => loadProduct(e, p)}
                  className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-secondary/50 rounded transition-colors truncate block"
                >
                  {p.product_name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CARD C — PASTE / UPLOAD ──────────────────────────────────────────────────
function CardC({ active, onActivate, pastedContent, setPastedContent, uploadedFiles, setUploadedFiles, uploading, setUploading }) {
  const fileInputRef = useRef(null);
  const uploadedFileList = Array.isArray(uploadedFiles) ? uploadedFiles.filter((file) => file && typeof file === 'object') : [];

  const handleFileDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer?.files || e.target?.files || []);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ name: file.name, url: file_url });
    }
    setUploadedFiles(prev => [...prev, ...uploaded]);
    setUploading(false);
  };

  return (
    <div
      onClick={onActivate}
      className={`rounded-xl border p-5 cursor-pointer transition-all space-y-3 ${
        active ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:border-primary/30 opacity-80'
      }`}
    >
      <div className="flex items-center gap-2">
        <Clipboard className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className={`text-sm font-bold ${active ? 'text-primary' : 'text-foreground'}`}>Paste Content or Upload Screenshots</p>
        {active && <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">SELECTED</span>}
      </div>
      <p className="text-[11px] text-muted-foreground">Paste page text, copy, or upload screenshots. FlowAI analyzes what you give it directly.</p>

      <textarea
        value={pastedContent}
        onChange={e => setPastedContent(e.target.value)}
        onPaste={e => { e.stopPropagation(); const t = e.clipboardData.getData('text/plain'); e.preventDefault(); setPastedContent(prev => prev + t); }}
        onClick={e => { e.stopPropagation(); onActivate(); }}
        placeholder="Paste any page content, copy, or notes here…"
        rows={4}
        className="w-full text-xs bg-background border border-input rounded-md px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />

      {/* Upload zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleFileDrop}
        onClick={e => { e.stopPropagation(); onActivate(); fileInputRef.current?.click(); }}
        className="border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/40 transition-colors"
      >
        <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={handleFileDrop} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Uploading…</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <UploadCloud className="h-4 w-4" />
            <span className="text-xs">Drop screenshots here or click to upload — PNG, JPG, PDF</span>
          </div>
        )}
      </div>

      {/* Uploaded files list */}
      {uploadedFileList.length > 0 && (
        <div className="space-y-1">
          {uploadedFileList.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-[11px] text-emerald-400">
              <span className="truncate">{f.name}</span>
              <button onClick={e => { e.stopPropagation(); setUploadedFiles(prev => (Array.isArray(prev) ? prev : []).filter((_, j) => j !== i)); }}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">Combine with Card B for best results on authenticated products.</p>
    </div>
  );
}

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();

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
          const shouldReplace = target.dataset?.pasteBehavior === 'replace';
          nativeInputValueSetter.call(target, shouldReplace ? text : target.value + text);
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    };
    document.addEventListener('paste', handlePaste, true);
    return () => document.removeEventListener('paste', handlePaste, true);
  }, []);

  // User info
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.full_name) setUserName(u.full_name);
      if (u?.email) setUserEmail(u.email);
      if (u?.role) setUserRole(u.role);
    }).catch(() => {});
  }, []);

  const [migrationModeEnabled, setMigrationModeEnabled] = useState(MIGRATION_MODE_ENABLED_FOR_UI);
  const [migrationFlagBusy, setMigrationFlagBusy] = useState(false);
  const [migrationFlagError, setMigrationFlagError] = useState('');
  const [operatorSecret, setOperatorSecret] = useState('');
  useEffect(() => {
    fetch('/api/operator/migration-mode', { headers: { Accept: 'application/json' } })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (typeof data?.enabled === 'boolean') setMigrationModeEnabled(data.enabled);
      })
      .catch(() => {});
  }, []);

  // Products for Card B
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  useEffect(() => {
    base44.entities.CreatedProduct.list('-created_date').then(d => { setProducts(Array.isArray(d) ? d : []); setLoadingProducts(false); }).catch(() => setLoadingProducts(false));
  }, []);

  // Active card (A | B | C | null)
  const [activeCard, setActiveCard] = useState(null);

  // Card A
  const [urlInput, setUrlInput] = useState('');
  const [fetchStatus, setFetchStatus] = useState(null); // null | 'valid' | 'blocked' | 'invalid'
  const [crawlerQuality, setCrawlerQuality] = useState(null); // null | 'none' | 'basic' | 'full'
  const [testing, setTesting] = useState(false);

  // Card B
  const [description, setDescription] = useState('');

  // Card C
  const [pastedContent, setPastedContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Objective
  const [objective, setObjective] = useState('audit_demo');
  const [customObjective, setCustomObjective] = useState('');
  const [objListening, setObjListening] = useState(false);
  const objRecRef = useRef(null);
  const operationModeRef = useRef(null);

  // Flow Hub axes
  const [mode, setMode] = useState('auto');
  const [depth, setDepth] = useState('Standard');
  const [structuralLayer, setStructuralLayer] = useState('autonomous');
  const [flowHubPath, setFlowHubPath] = useState('production');
  const [inngestReady, setInngestReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stored = readStoredFlowHubAxes();
    const nextAxes = normalizeFlowHubAxes({
      ...stored,
      structuralLayer: params.get('structuralLayer') ?? stored.structuralLayer,
      operationalMode: params.get('operationalMode') ?? params.get('mode') ?? stored.operationalMode,
      analysisDepth: params.get('analysisDepth') ?? params.get('depth') ?? stored.analysisDepth,
      flowHubPath: params.get('flowHubPath') ?? params.get('path') ?? params.get('mode') ?? flowHubPathFromPathname(location.pathname),
    });
    setMode(nextAxes.operationalMode);
    setDepth(analysisDepthLabel(nextAxes.analysisDepth));
    setStructuralLayer(nextAxes.structuralLayer);
    setFlowHubPath(nextAxes.flowHubPath);
    if (nextAxes.flowHubPath === 'migration') {
      setActiveCard('A');
      window.requestAnimationFrame(() => {
        operationModeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else if (nextAxes.flowHubPath === 'fresh_build') {
      setActiveCard((current) => current || 'B');
    }
  }, [location.pathname, location.search]);

  const persistAxesPatch = (patch = {}) => writeStoredFlowHubAxes(normalizeFlowHubAxes({
    structuralLayer,
    operationalMode: mode,
    analysisDepth: analysisDepthValue(depth),
    flowHubPath,
    ...patch,
  }));
  const setOperationalMode = (nextMode) => {
    setMode(nextMode);
    persistAxesPatch({ operationalMode: nextMode });
  };
  const setAnalysisDepthLabel = (nextDepth) => {
    setDepth(nextDepth);
    persistAxesPatch({ analysisDepth: analysisDepthValue(nextDepth) });
  };
  const setFlowHubPathSelection = (nextPath) => {
    const nextAxes = persistAxesPatch({ flowHubPath: nextPath });
    setFlowHubPath(nextAxes.flowHubPath);
    const option = flowHubPathOption(nextAxes.flowHubPath);
    if (location.pathname !== option.path) {
      navigate({ pathname: option.path, search: location.search }, { replace: false });
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health', {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!cancelled) setInngestReady(data?.inngestReady === true);
      })
      .catch(() => {
        if (!cancelled) setInngestReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // W6 INTEGRATION — Track C: inline construction-engine run panel.
  // Shown when the user clicks "Run FlowAI" from Card A + Auto mode.
  // The legacy /auto-runner path is still available as the secondary
  // "Advanced (legacy)" link.
  const [runPanelUrl, setRunPanelUrl] = useState(null);

  // ── Test Fetch (Card A) ──
  // Client-side URL safety screen only. It does not call a server endpoint
  // and does not claim reachability; authenticated crawl paths enforce
  // server-side URL safety before live execution.
  const testFetch = () => {
    if (!urlInput.trim()) return;
    setTesting(true);
    const safety = evaluateClientUrlSafety(urlInput);
    setFetchStatus(safety.status === 'empty' ? null : safety.status);
    setCrawlerQuality(null);
    setTesting(false);
  };

  // ── Objective voice ──
  const toggleObjVoice = () => {
    if (objListening) { objRecRef.current?.stop(); setObjListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'en-US';
    r.onresult = (e) => setCustomObjective(prev => prev ? prev + ' ' + e.results[0][0].transcript : e.results[0][0].transcript);
    r.onend = () => setObjListening(false);
    r.onerror = () => setObjListening(false);
    objRecRef.current = r;
    r.start();
    setObjListening(true);
  };

  const setMigrationModeRuntimeFlag = async (enabled) => {
    setMigrationFlagBusy(true);
    setMigrationFlagError('');
    try {
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (operatorSecret.trim()) headers['x-flowai-operator-secret'] = operatorSecret.trim();
      const response = await fetch(enabled
        ? '/api/operator/enable-migration-mode'
        : '/api/operator/disable-migration-mode', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok !== true) {
        throw new Error(data?.error || data?.message || `Request failed with ${response.status}`);
      }
      setMigrationModeEnabled(Boolean(data.enabled));
      setOperatorSecret('');
    } catch (error) {
      setMigrationFlagError(error?.message || 'Unable to update Migration Mode.');
    } finally {
      setMigrationFlagBusy(false);
    }
  };

  // ── Valid input check ──
  const urlSafety = activeCard === 'A' ? evaluateClientUrlSafety(urlInput) : null;
  const isUrlLaunchBlocked = activeCard === 'A' && urlSafety?.launchBlocked === true;
  const hasValidInput =
    (activeCard === 'A' && !!urlInput.trim() && !isUrlLaunchBlocked) ||
    (activeCard === 'B' && !!description.trim()) ||
    (activeCard === 'C' && (!!pastedContent.trim() || uploadedFiles.length > 0));

  // ── Launch ──
  const launch = () => {
    if (activeCard === 'A') {
      const safety = evaluateClientUrlSafety(urlInput);
      if (safety.launchBlocked) {
        setFetchStatus(safety.status);
        setActiveCard('A');
        return;
      }
    }

    const uploadedFileList = Array.isArray(uploadedFiles) ? uploadedFiles.filter((file) => file && typeof file === 'object') : [];
    const effectiveObjective = objective === 'custom'
      ? (customObjective.trim() || 'Custom objective')
      : OBJECTIVES.find(o => o.value === objective)?.label || objective;

    let inputs = [];
    let inputMethod = 'describe';
    if (activeCard === 'A') {
      inputs = [{ id: 1, type: 'url', value: urlInput.trim(), name: 'Input A' }];
      inputMethod = 'clone';
    } else if (activeCard === 'B') {
      // Extract optional credentials from description template fields
      const emailMatch = description.match(/Login email \(optional.*?\):\s*(.+)/i);
      const passMatch  = description.match(/Login password \(optional.*?\):\s*(.+)/i);
      const creds = (emailMatch?.[1]?.trim() && passMatch?.[1]?.trim())
        ? { email: emailMatch[1].trim(), password: passMatch[1].trim() }
        : null;
      inputs = [{ id: 1, type: 'description', value: description.trim(), name: 'Input A', credentials: creds }];
      inputMethod = 'describe';
    } else if (activeCard === 'C') {
      const combinedContent = [
        pastedContent.trim(),
        uploadedFileList.length > 0 ? `[Uploaded files: ${uploadedFileList.map(f => f.name).join(', ')}]` : '',
      ].filter(Boolean).join('\n\n');
      inputs = [{ id: 1, type: 'description', value: combinedContent, name: 'Input A', file_urls: uploadedFileList.map(f => f.url) }];
      inputMethod = 'describe';
    }

    const config = {
      inputs,
      inputMethod,
      objective: effectiveObjective,
      opsMode: mode,
      structuralLayer,
      flowHubPath,
      analysisDepth: analysisDepthValue(depth),
      autoParams: {
        depth: `${depth} (${depth === 'Quick' ? '3–5 min' : depth === 'Standard' ? '8–10 min' : '15–20 min'})`,
        benchmark: false,
        threshold: '80%',
        maxReruns: 2,
        format: 'Summary',
      },
      multiMode: null,
      product: null,
    };

    saveSessionConfig(config);

    // W6 INTEGRATION — Track C: when the user picks Card A (live URL)
    // + Auto mode, the primary path is the inline construction-engine
    // run via /api/run-construction (real SSE, real preview deploy,
    // real governance record). The legacy /auto-runner remains the
    // secondary "Advanced (legacy)" link below.
    if (activeCard === 'A' && urlInput.trim()) {
      setRunPanelUrl(urlInput.trim());
      return;
    }

    if (mode === 'auto') navigate('/auto-runner');
    else if (mode === 'guided') navigate('/guided/research');
    else navigate('/manual/research');
  };

  const isConstructionEnginePath = activeCard === 'A' && !!urlInput.trim();
  const isMigrationMode = flowHubPath === 'migration';
  const isFreshBuildMode = flowHubPath === 'fresh_build';
  const currentPathOption = flowHubPathOption(flowHubPath);
  const isFocusedMigrationSetup = location.pathname === '/flow-hub/migration'
    || new URLSearchParams(location.search).get('mode') === 'migration'
    || new URLSearchParams(location.search).get('flowHubPath') === 'migration';
  const isMigrationLaunchBlocked = isMigrationMode && !migrationModeEnabled;
  const isFreshBuildLaunchBlocked = isFreshBuildMode && !FRESH_BUILD_ENABLED_FOR_UI;
  const migrationProductConfig = isFocusedMigrationSetup
    ? findRegisteredProductConfigForUrl(urlInput.trim())
    : null;
  const detectedPlatform = isFocusedMigrationSetup
    ? detectMigrationPlatformHint({ url: urlInput, description, productConfig: migrationProductConfig })
    : '';
  const upgradeTarget = migrationProductConfig?.upgrade_repo
    || migrationProductConfig?.repo
    || 'Registered upgrade repo resolves after product match';
  const estimatedFiles = estimateMigrationFiles(migrationProductConfig);
  const operatorEmailMatches = FLOWAI_OPERATOR_EMAIL
    && userEmail
    && FLOWAI_OPERATOR_EMAIL.toLowerCase() === userEmail.toLowerCase();
  const userIsOperator = ['admin', 'operator', 'owner'].includes(String(userRole || '').toLowerCase())
    || operatorEmailMatches;
  const operatorContact = FLOWAI_OPERATOR_EMAIL
    ? `${FLOWAI_OPERATOR_NAME} (${FLOWAI_OPERATOR_EMAIL})`
    : FLOWAI_OPERATOR_NAME !== 'FlowAI operator'
      ? FLOWAI_OPERATOR_NAME
      : 'your FlowAI operator';
  if (isFocusedMigrationSetup) {
    return (
      <FocusedMigrationSetup
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        description={description}
        setDescription={setDescription}
        setActiveCard={setActiveCard}
        setFlowHubPath={setFlowHubPathSelection}
        runPanelUrl={runPanelUrl}
        setRunPanelUrl={setRunPanelUrl}
        migrationModeEnabled={migrationModeEnabled}
        migrationFlagBusy={migrationFlagBusy}
        migrationFlagError={migrationFlagError}
        setMigrationModeRuntimeFlag={setMigrationModeRuntimeFlag}
        userIsOperator={userIsOperator}
        operatorContact={operatorContact}
        operatorSecret={operatorSecret}
        setOperatorSecret={setOperatorSecret}
        detectedPlatform={detectedPlatform}
        upgradeTarget={upgradeTarget}
        estimatedFiles={estimatedFiles}
        structuralLayer={structuralLayer}
        operationalMode={mode}
        analysisDepth={analysisDepthValue(depth)}
        flowHubPath={flowHubPath}
      />
    );
  }
  const launchLabel = isConstructionEnginePath
    ? 'Run FlowAI on this URL →'
    : mode === 'auto'
    ? 'Launch Auto Run →'
    : mode === 'guided'
    ? 'Start Guided Session →'
    : 'Start Manual Session →';

  return (
    <div className="min-h-screen bg-background text-foreground font-inter">

      {/* ── SECTION 1: HEADER ── */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">Flow Hub - {currentPathOption.label}</h1>
              <div className="text-[10px] text-muted-foreground leading-tight">
                {currentPathOption.description}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> FlowAI Ready
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Layer: <span className="text-foreground font-semibold capitalize">{structuralLayer}</span></span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Mode: <span className="text-foreground font-semibold capitalize">{mode}</span></span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Depth: <span className="text-foreground font-semibold">{depth}</span></span>
            {userName && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground font-semibold">{userName}</span>
              </>
            )}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-2">
          <p className="text-xs text-muted-foreground">Choose how you want to work with your product, then select your operation mode.</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── SECTION 0: HONEST VALUE PROPOSITION + RELEASE-STATE DISCLOSURE ── */}
        {/* Plain, accurate description of what this tool actually does.
            No marketing inflation, no fabricated certifications. The
            release-state badge sets visitor expectations immediately
            because the public URL otherwise looks like a SaaS landing
            page. */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                Pre-release · Internal use only
              </span>
              <span className="text-[10px] text-muted-foreground">v0.1 · VEU AI Studio personnel + licensed pilots</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              <span className="font-semibold text-foreground">FlowAI</span> is a universal product
              upgrade engine. Give it a product URL, description, or supporting context and it runs
              the 8-step pipeline — Research, Design, Build, Quality Audit, Deploy, Self-Renewal,
              Go-to-Market, Monitor — toward the CEO-defined 95/100 target.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">What you get:</span> a per-step report,
              honest scoring evidence, and an upgraded URL when deployment succeeds. Display bands:
              Excellent 90–100 · Strong 75–89 · Developing 50–74 · Needs Work 25–49 · Critical 0–24.
              Human-only criteria remain unverified until evidence exists; FlowAI reports gaps instead
              of inflating the score.
            </p>
          </div>
        </motion.section>

        {/* ── SECTION 2: THREE INPUT CARDS ── */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-3">
            Setup 1 of 3 — Select your input
            <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/70">
              (one of three setup steps; the 8-step pipeline runs after launch)
            </span>
          </p>
          <div className="grid grid-cols-1 gap-4">
            <CardA
              active={activeCard === 'A'}
              onActivate={() => setActiveCard('A')}
              url={urlInput}
              setUrl={setUrlInput}
              fetchStatus={fetchStatus}
              setFetchStatus={setFetchStatus}
              onTestFetch={testFetch}
              testing={testing}
              crawlerQuality={crawlerQuality}
            />
            <CardB
              active={activeCard === 'B'}
              onActivate={() => setActiveCard('B')}
              description={description}
              setDescription={setDescription}
              setUrlInput={setUrlInput}
              products={products}
              loadingProducts={loadingProducts}
            />
            <CardC
              active={activeCard === 'C'}
              onActivate={() => setActiveCard('C')}
              pastedContent={pastedContent}
              setPastedContent={setPastedContent}
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles}
              uploading={uploading}
              setUploading={setUploading}
            />
          </div>
        </motion.section>

        {/* ── SECTION 3: OBJECTIVE ── */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Setup 2 of 3 — What do you want to accomplish?</p>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <select
              value={objective}
              onChange={e => setObjective(e.target.value)}
              className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <AnimatePresence>
              {objective === 'custom' && (
                <motion.div key="custom" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex gap-2 items-center pt-1">
                    <Input
                      value={customObjective}
                      onChange={e => setCustomObjective(e.target.value)}
                      onPaste={e => { e.stopPropagation(); const t = e.clipboardData.getData('text/plain'); e.preventDefault(); setCustomObjective(t); }}
                      placeholder="Describe your objective…"
                      className="h-9 text-sm flex-1"
                    />
                    {SPEECH_SUPPORTED && (
                      <button
                        onClick={toggleObjVoice}
                        className={`h-9 w-9 flex items-center justify-center rounded-md border shrink-0 transition-all ${objListening ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse' : 'border-input text-muted-foreground hover:text-foreground'}`}
                      >
                        {objListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* ── SECTION 4: OPERATION MODE ── */}
        <motion.section ref={operationModeRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Setup 3 of 3 — Select operation mode</p>
          <div className="grid grid-cols-1 gap-4">

            {/* Auto */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setOperationalMode('auto')}
              onKeyDown={e => e.key === 'Enter' && setOperationalMode('auto')}
              className={`rounded-xl border p-5 text-left space-y-3 transition-all cursor-pointer ${mode === 'auto' ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:border-primary/30'}`}
            >
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${mode === 'auto' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${mode === 'auto' ? 'text-primary' : 'text-foreground'}`}>Auto</span>
                {mode === 'auto' && <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">SELECTED</span>}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                FlowAI executes all 8 pipeline steps automatically — Research → Design → Build →
                Quality Audit → Deploy → Self-Renewal → Go-to-Market → Monitor. You review the
                final report with the Clearance score and per-step findings.
              </p>
              <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                <p className="text-[10px] font-semibold text-muted-foreground">Analysis Depth</p>
                <div className="flex gap-1.5">
                  {DEPTHS.map(d => (
                    <button
                      key={d}
                      onClick={e => { e.stopPropagation(); setAnalysisDepthLabel(d); setOperationalMode('auto'); }}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all font-semibold ${depth === d && mode === 'auto' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Guided */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setOperationalMode('guided')}
              onKeyDown={e => e.key === 'Enter' && setOperationalMode('guided')}
              className={`rounded-xl border p-5 text-left space-y-3 transition-all cursor-pointer ${mode === 'guided' ? 'border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/20' : 'border-border bg-card hover:border-amber-500/30'}`}
            >
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${mode === 'guided' ? 'text-amber-400' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${mode === 'guided' ? 'text-amber-400' : 'text-foreground'}`}>Guided</span>
                {mode === 'guided' && <span className="ml-auto text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">SELECTED</span>}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                FlowAI proposes each of the 8 pipeline steps in turn. You approve, modify, or
                skip each one before it executes.
              </p>
              <p className="text-[10px] text-muted-foreground">Minutes to hours · 8 approval gates across the execution pipeline</p>
            </div>

            {/* Manual */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setOperationalMode('manual')}
              onKeyDown={e => e.key === 'Enter' && setOperationalMode('manual')}
              className={`rounded-xl border p-5 text-left space-y-3 transition-all cursor-pointer ${mode === 'manual' ? 'border-border bg-secondary/30 ring-1 ring-border' : 'border-border bg-card hover:border-primary/30'}`}
            >
              <div className="flex items-center gap-2">
                <Wrench className={`h-4 w-4 ${mode === 'manual' ? 'text-foreground' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${mode === 'manual' ? 'text-foreground' : 'text-foreground'}`}>Manual</span>
                {mode === 'manual' && <span className="ml-auto text-[10px] font-bold text-foreground bg-secondary px-2 py-0.5 rounded-full">SELECTED</span>}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">You direct each step. FlowAI executes what you specify and assists on demand.</p>
              <p className="text-[10px] text-muted-foreground">Hours to days · Full operator control</p>
            </div>

            {/* Fresh Build */}
            <div
              role="button"
              tabIndex={FRESH_BUILD_ENABLED_FOR_UI ? 0 : -1}
              aria-disabled={!FRESH_BUILD_ENABLED_FOR_UI}
              onClick={() => FRESH_BUILD_ENABLED_FOR_UI && setFlowHubPathSelection('fresh_build')}
              onKeyDown={e => e.key === 'Enter' && FRESH_BUILD_ENABLED_FOR_UI && setFlowHubPathSelection('fresh_build')}
              className={`rounded-xl border p-5 text-left space-y-3 transition-all ${
                flowHubPath === 'fresh_build'
                  ? 'border-fuchsia-500/60 bg-fuchsia-500/5 ring-1 ring-fuchsia-500/20'
                  : FRESH_BUILD_ENABLED_FOR_UI
                    ? 'border-border bg-card hover:border-fuchsia-500/30 cursor-pointer'
                    : 'border-border bg-card/70 opacity-70 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className={`h-4 w-4 ${flowHubPath === 'fresh_build' ? 'text-fuchsia-300' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${flowHubPath === 'fresh_build' ? 'text-fuchsia-300' : 'text-foreground'}`}>Fresh Build</span>
                <span className="ml-auto text-[10px] font-bold text-fuchsia-200 bg-fuchsia-500/10 border border-fuchsia-500/20 px-2 py-0.5 rounded-full">
                  EXPERIMENTAL
                </span>
                {flowHubPath === 'fresh_build' && <span className="text-[10px] font-bold text-fuchsia-300 bg-fuchsia-500/10 px-2 py-0.5 rounded-full">SELECTED</span>}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                FlowAI runs Feature Extractor, Design Synthesizer, and Codebase Generator to create a platform-free codebase in the upgrade repo.
              </p>
              <div className="rounded-md border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 text-[11px] text-muted-foreground leading-relaxed">
                {FRESH_BUILD_ENABLED_FOR_UI
                  ? 'Fresh Build is enabled for this environment. Existing modes remain unchanged.'
                  : 'Fresh Build is off by default. Victor must enable FLOWAI_ENABLE_FRESH_BUILD before execution.'}
              </div>
            </div>

            {/* Migration */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setFlowHubPathSelection('migration')}
              onKeyDown={e => e.key === 'Enter' && setFlowHubPathSelection('migration')}
              className={`rounded-xl border p-5 text-left space-y-3 transition-all cursor-pointer ${flowHubPath === 'migration' ? 'border-cyan-500/60 bg-cyan-500/5 ring-1 ring-cyan-500/20' : 'border-border bg-card hover:border-cyan-500/30'}`}
            >
              <div className="flex items-center gap-2">
                <GitBranch className={`h-4 w-4 ${flowHubPath === 'migration' ? 'text-cyan-300' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${flowHubPath === 'migration' ? 'text-cyan-300' : 'text-foreground'}`}>Migrate</span>
                {flowHubPath === 'migration' && <span className="ml-auto text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full">SELECTED</span>}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                FlowAI detects platform dependencies and migrates the product to a standalone v2. Original stays frozen as rollback.
              </p>
              {migrationModeEnabled ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                  <div className="rounded-md border border-border bg-background/60 p-2">
                    <p className="font-semibold text-foreground">Plan</p>
                    <p className="text-muted-foreground">File count and dependency count before execution</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/60 p-2">
                    <p className="font-semibold text-foreground">Progress</p>
                    <p className="text-muted-foreground">Per-file migration status during execution</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/60 p-2">
                    <p className="font-semibold text-foreground">Summary</p>
                    <p className="text-muted-foreground">Files migrated, dependencies removed, upgrade URL</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                  {userIsOperator ? (
                    <>
                      <p className="text-[11px] font-semibold text-amber-200">Migration Mode is currently disabled.</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMigrationModeRuntimeFlag(true);
                        }}
                        disabled={migrationFlagBusy}
                        className="inline-flex items-center rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold text-amber-100 hover:bg-amber-400/15"
                      >
                        {migrationFlagBusy && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                        Enable Migration Mode
                      </button>
                      {migrationFlagError && <p className="text-[11px] text-red-300">{migrationFlagError}</p>}
                    </>
                  ) : (
                    <p className="text-[11px] text-amber-200 leading-relaxed">
                      Migration Mode requires operator activation. Contact {operatorContact} to enable it.
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        </motion.section>

        {/* ── SECTION 5: LAUNCH ── */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {/* W6 INTEGRATION — Track C: when the construction-engine
              path is active, the launch card is replaced inline by
              the streaming run panel after click. */}
          {runPanelUrl ? (
            <RunConstructionPanel
              url={runPanelUrl}
              mode={resolveRunConstructionMode({
                mode,
                operationalMode: mode,
                structuralLayer,
                isMigrationMode,
                isFreshBuildMode,
                inngestReady,
              })}
              operationalMode={mode}
              structuralLayer={structuralLayer}
              analysisDepth={analysisDepthValue(depth)}
              flowHubPath={flowHubPath}
              autoStart
              onClose={() => setRunPanelUrl(null)}
            />
          ) : (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {hasValidInput
                    ? <span className="text-foreground font-semibold">Ready — {activeCard === 'A' ? 'URL' : activeCard === 'B' ? 'Description' : 'Pasted content'} loaded · {OBJECTIVES.find(o => o.value === objective)?.label}</span>
                    : <span>Select an input above to enable launch</span>
                  }
                </div>
                <Button
                  onClick={launch}
                  disabled={!hasValidInput || isMigrationLaunchBlocked || isFreshBuildLaunchBlocked}
                  size="lg"
                  className="gap-2 w-full sm:min-w-[220px] sm:w-auto text-sm font-bold min-h-[48px]"
                >
                  <ChevronRight className="h-4 w-4" />
                  {launchLabel}
                </Button>
              </div>
              {isMigrationLaunchBlocked && (
                <div className="text-[11px] text-amber-300 text-right">
                  Migration Mode is currently disabled. Use Flow Hub Migration to enable it.
                </div>
              )}
              {isFreshBuildLaunchBlocked && (
                <div className="text-[11px] text-fuchsia-200 text-right">
                  Fresh Build is currently disabled. Victor must enable FLOWAI_ENABLE_FRESH_BUILD.
                </div>
              )}
              {/* Secondary legacy link: only shown when the construction-
                  engine path is the active primary (URL+Auto). Otherwise
                  this CTA already routes through /auto-runner. */}
              {isConstructionEnginePath && (
                <div className="text-[11px] text-muted-foreground text-right">
                  Need the legacy multi-step pipeline?{' '}
                  <button
                    onClick={() => navigate('/auto-runner')}
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    Advanced (legacy) →
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.section>

        {/* ── SECTION 6: QUICK ACCESS PANEL ── */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Quick Access</p>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
            {[
              { label: 'My Products',        path: '/my-products',    icon: Layers },
              { label: 'Session History',    path: '/auto-runner',    icon: History },
              { label: 'Clearance Protocol', path: '/clearance',      icon: ShieldCheck },
              { label: 'Governance Dashboard', path: '/governance',   icon: BarChart3 },
              { label: 'Release Notes',      path: '/release-notes',  icon: BookOpen },
            ].map(({ label, path, icon: Icon }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
              </button>
            ))}
          </div>
        </motion.section>

      </main>

      <footer className="border-t border-border py-6 px-6 mt-8">
        <div className="max-w-6xl mx-auto text-center text-[11px] text-muted-foreground space-y-2">
          <div>FlowAI Engine v0.1 · VEU AI Studio Internal Platform · © 2026 VEU AI Studio · Patent pending</div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/privacy-policy')}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              Privacy Policy
            </button>
            <span className="text-muted-foreground/40">·</span>
            <button
              onClick={() => navigate('/terms-of-use')}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              Terms of Use
            </button>
            <span className="text-muted-foreground/40">·</span>
            <button
              onClick={() => navigate('/landing')}
              className="text-[11px] text-primary hover:text-primary/80 transition-colors"
            >
              About FlowAI →
            </button>
          </div>
          {/* Honest release-state disclosure — no fabricated certifications,
              no customer testimonials, no compliance claims FlowAI doesn't hold. */}
          <div className="text-[10px] text-muted-foreground/70 leading-relaxed pt-2">
            FlowAI is a pre-release internal engine. It does <span className="font-semibold">not</span>{' '}
            hold SOC 2, ISO 27001, or any third-party compliance certification at this time, and
            there are no external customer case studies published. Use is limited to VEU AI Studio
            personnel and licensed pilots until those gates are cleared.
          </div>
        </div>
      </footer>
    </div>
  );
}
