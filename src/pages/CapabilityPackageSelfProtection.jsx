// ─── CAPABILITY PACKAGE — SELF-PROTECTION ────────────────────────────────────
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Shield, Copy, Check, Zap, Lock, FileText, AlertTriangle } from 'lucide-react';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-all"
    >
      {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
    </button>
  );
}

const PACKAGE_COMPONENTS = [
  {
    id: 'anti-crawling',
    icon: Shield,
    color: 'text-red-400 border-red-500/30 bg-red-500/5',
    label: 'Component 1 — Anti-Crawling Sprint',
    desc: 'Installs bot detection, rate limiting, and headless browser blocking.',
    sprint: `Sprint Title: Install Anti-Crawling Protection
File: lib/botDetection.js (new file)
Location: Import in AppLayout or root component

Create lib/botDetection.js:

// Bot and crawler detection utility
const requestLog = new Map(); // ip -> [{timestamp}]

export function detectBot(userAgent = '') {
  const ua = userAgent.toLowerCase();
  // Headless browser signatures
  const headlessSignals = [
    'headlesschrome', 'phantomjs', 'selenium', 'webdriver',
    'puppeteer', 'playwright', 'nightwatch', 'testcafe'
  ];
  if (headlessSignals.some(sig => ua.includes(sig))) return 'headless_browser';
  if (!userAgent || ua === '' || ua === 'node') return 'missing_useragent';
  return null;
}

export function checkRateLimit(sessionId, maxPerMinute = 30) {
  const now = Date.now();
  const window = 60000;
  const log = requestLog.get(sessionId) || [];
  const recent = log.filter(t => now - t < window);
  recent.push(now);
  requestLog.set(sessionId, recent);
  if (recent.length > maxPerMinute) return 'rate_limit_exceeded';
  return null;
}

export function installBotDetection(onDetect) {
  // Monitor for automated form submission patterns
  let rapidClickCount = 0;
  let lastClickTime = 0;
  document.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastClickTime < 50) rapidClickCount++;
    else rapidClickCount = 0;
    lastClickTime = now;
    if (rapidClickCount > 10) onDetect('rapid_automated_clicks');
  });
}

Then in your root component or AppLayout, call:
import { detectBot, installBotDetection } from '@/lib/botDetection';
import { logBotDetection } from '@/lib/contentProtection';

useEffect(() => {
  const bot = detectBot(navigator.userAgent);
  if (bot) logBotDetection(bot);
  installBotDetection(logBotDetection);
}, []);

Verify: Open browser DevTools console and check no bot signals are fired for normal navigation.`,
  },
  {
    id: 'content-protection',
    icon: Lock,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
    label: 'Component 2 — Content Protection Sprint',
    desc: 'Disables right-click, text selection on proprietary content, and adds watermarks.',
    sprint: `Sprint Title: Install Content Protection
File: lib/contentProtection.js (new file) + AppLayout
Location: Import in root App component

Create lib/contentProtection.js with these exports:

export function installRightClickProtection() {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // Show polite notice
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#0e1521;border:1px solid rgba(59,130,246,0.4);color:#94a3b8;font-size:12px;padding:10px 16px;border-radius:8px;z-index:99999;pointer-events:none;';
    el.textContent = '[Product Name] is proprietary technology. Unauthorized reproduction is prohibited.';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
    return false;
  });
}

export function installSelectProtection() {
  // Add CSS to disable text selection on report content
  const style = document.createElement('style');
  style.textContent = '.protected-content { user-select: none !important; -webkit-user-select: none !important; }';
  document.head.appendChild(style);
}

Then wrap all generated report/output content with className="protected-content".

Add watermark to reports:
<div className="relative">
  <span style={{position:'absolute',bottom:'8px',right:'8px',fontSize:'9px',color:'rgba(148,163,184,0.15)',fontFamily:'monospace',transform:'rotate(-15deg)',pointerEvents:'none',userSelect:'none',whiteSpace:'nowrap'}}>
    Confidential — VEU AI Studio — [Product] v1.0
  </span>
  {children}
</div>

Verify: Right-click on the product page. Polite notice appears. Cannot select text in report output sections.`,
  },
  {
    id: 'ip-notice',
    icon: FileText,
    color: 'text-primary border-primary/30 bg-primary/5',
    label: 'Component 3 — IP Notice Sprint',
    desc: 'Adds legal IP notices and copyright footer to every page.',
    sprint: `Sprint Title: Install IP Protection Notices
File: components/shared/IPFooter.jsx (new file)
Location: Add to AppLayout or main layout wrapper

Create components/shared/IPFooter.jsx:

import { Link } from 'react-router-dom';

export default function IPFooter({ productName = 'This product' }) {
  return (
    <footer className="border-t border-border bg-card/30 px-6 py-4 mt-auto">
      <div className="max-w-6xl mx-auto space-y-1 text-center">
        <p className="text-[10px] text-muted-foreground">
          {productName} is proprietary technology of VEU AI Studio. Unauthorized access, scraping, reverse engineering, or redistribution is prohibited.
        </p>
        <p className="text-[10px] text-muted-foreground">
          © 2026 VEU AI Studio. All rights reserved. Patent pending.
        </p>
        <div className="flex items-center justify-center gap-3 text-[10px]">
          <a href="/terms-of-use" className="text-muted-foreground hover:text-primary">Terms of Use</a>
          <span>·</span>
          <a href="/privacy-policy" className="text-muted-foreground hover:text-primary">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}

In AppLayout or main layout, add <IPFooter productName="[Product Name]" /> at the bottom of the page container.

Also add robots.txt to the public folder:
User-agent: *
Disallow: /api/
Disallow: /functions/
Crawl-delay: 10

Verify: Footer appears on all pages. Right-click blocked. robots.txt accessible at /robots.txt.`,
  },
  {
    id: 'demo-disclaimer',
    icon: AlertTriangle,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
    label: 'Component 4 — Demo Environment Disclaimer Sprint',
    desc: 'Replaces "Simulated Demo Environment" banners with a professional, non-damaging notice.',
    sprint: `Sprint Title: Replace Demo Environment Notice with Professional Disclaimer
File: components/shared/DemoDisclaimer.jsx (new file)
Location: Replace any existing "Simulated Demo Environment" banners

Create components/shared/DemoDisclaimer.jsx:

export default function DemoDisclaimer({ productName, contactEmail }) {
  return (
    <div className="w-full bg-primary/5 border-b border-primary/20 px-4 py-2 text-center">
      <p className="text-[11px] text-muted-foreground">
        This is a controlled demonstration environment. Content is illustrative.{' '}
        <a
          href={\`mailto:\${contactEmail || \`\${productName?.toLowerCase().replace(/\\s/g, '')}@veuaistudio.com\`}\`}
          className="text-primary hover:underline font-semibold"
        >
          Contact us for production access
        </a>
      </p>
    </div>
  );
}

Search for all instances of "Simulated Demo Environment" and "Demo Mode" banners in the codebase and replace with:
<DemoDisclaimer productName="[Product Name]" contactEmail="[product]@veuaistudio.com" />

Verify: No page shows "Simulated Demo Environment" text. Professional disclaimer appears in its place.`,
  },
];

export default function CapabilityPackageSelfProtection() {
  const [targetUrl, setTargetUrl] = useState('');
  const navigate = useNavigate();

  return (
    <div className="p-8 lg:p-10 max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
          <span className="text-border">/</span>
          <span className="text-xs text-muted-foreground">Capability Packages</span>
          <span className="text-border">/</span>
          <span className="text-xs text-foreground font-semibold">Self-Protection</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-3">
          <Shield className="h-7 w-7 text-primary" /> Self-Protection Package
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Four-component package that installs anti-crawling, IP protection, and content security into any Base44 product.
        </p>
      </motion.div>

      {/* One-click install CTA */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
        <p className="text-sm font-bold text-primary">One-Click Installation Sprint</p>
        <p className="text-xs text-muted-foreground">Enter a target product URL and generate a consolidated protection sprint for that product.</p>
        <div className="flex gap-2">
          <Input
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder="https://saigedemo.com"
            className="h-9 text-sm flex-1"
          />
          <Button size="sm" onClick={() => navigate('/capability-packages/self-protection/install')} className="gap-1.5 shrink-0">
            <Zap className="h-3.5 w-3.5" /> View All Sprints
          </Button>
        </div>
      </div>

      {/* Four package components */}
      <div className="space-y-4">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Package Components</p>
        {PACKAGE_COMPONENTS.map((comp, i) => {
          const Icon = comp.icon;
          return (
            <motion.div
              key={comp.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl border p-5 space-y-3 ${comp.color}`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-bold">{comp.label}</span>
                </div>
                <CopyBtn text={comp.sprint} />
              </div>
              <p className="text-[11px] text-muted-foreground">{comp.desc}</p>
              <div className="rounded-lg bg-background border border-border p-3">
                <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto max-h-32 overflow-y-auto">
                  {comp.sprint.slice(0, 200)}…
                </pre>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}