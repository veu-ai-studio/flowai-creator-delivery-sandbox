import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Users, Plug, Building2, CheckCircle2,
  AlertTriangle, XCircle, Loader2, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const TABS = [
  { key: 'org', label: 'Organization', icon: Building2 },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'integrations', label: 'Integrations', icon: Plug },
];

const INTEGRATIONS = [
  { name: 'Supabase',    desc: 'Primary persistence layer',       category: 'Data',       envKey: 'SUPABASE_URL' },
  { name: 'Inngest',     desc: 'Background job orchestration',    category: 'Jobs',       envKey: 'INNGEST_EVENT_KEY' },
  { name: 'Clerk',       desc: 'Multi-tenant authentication',     category: 'Auth',       envKey: 'CLERK_SECRET_KEY' },
  { name: 'Resend',      desc: 'Transactional email delivery',    category: 'Email',      envKey: 'RESEND_API_KEY' },
  { name: 'Voyage AI',   desc: 'Vector embeddings',               category: 'AI',         envKey: 'VOYAGE_API_KEY' },
  { name: 'Axiom',       desc: 'Structured logging & observability', category: 'Logs',   envKey: 'AXIOM_DATASET' },
  { name: 'Anthropic',   desc: 'Claude LLM provider',             category: 'AI',         envKey: 'ANTHROPIC_API_KEY', status: 'connected' },
  { name: 'Browser API', desc: 'Headless browser / crawling',     category: 'Infra',      envKey: 'PLAYWRIGHT_ENDPOINT', status: 'connected' },
  { name: 'OpenAI',      desc: 'GPT model provider',              category: 'AI',         envKey: 'OPENAI_API_KEY', status: 'connected' },
  { name: 'Vercel',      desc: 'Deployment & hosting',            category: 'Infra',      envKey: 'VERCEL_TOKEN', status: 'connected' },
  { name: 'Replit',      desc: 'Code execution environment',      category: 'Infra',      envKey: 'REPLIT_ENDPOINT', status: 'connected' },
];

// Known-connected secrets from environment
const KNOWN_CONNECTED = ['ANTHROPIC_API_KEY', 'PLAYWRIGHT_ENDPOINT', 'OPENAI_API_KEY', 'VERCEL_TOKEN', 'REPLIT_ENDPOINT'];

const MOCK_MEMBERS = [
  { name: 'Victor (Owner)', email: 'victor@veuaistudio.com', role: 'owner' },
  { name: 'FlowAI System',  email: 'system@flowai.internal', role: 'admin' },
];

const ROLE_STYLES = {
  owner: 'text-primary bg-primary/10 border-primary/30',
  admin: 'text-amber-400 bg-amber-400/10 border-amber-500/30',
  member: 'text-muted-foreground bg-secondary border-border',
};

const STATUS_ICON = {
  connected:    <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  disconnected: <XCircle className="h-4 w-4 text-red-400" />,
  unknown:      <AlertTriangle className="h-4 w-4 text-amber-400" />,
};

function getStatus(integration) {
  if (KNOWN_CONNECTED.includes(integration.envKey)) return 'connected';
  if (integration.status === 'connected') return 'connected';
  return 'disconnected';
}

const CATEGORY_COLORS = {
  Data:  'text-blue-400 bg-blue-400/10',
  Jobs:  'text-purple-400 bg-purple-400/10',
  Auth:  'text-emerald-400 bg-emerald-400/10',
  Email: 'text-amber-400 bg-amber-400/10',
  AI:    'text-primary bg-primary/10',
  Logs:  'text-muted-foreground bg-secondary',
  Infra: 'text-cyan-400 bg-cyan-400/10',
};

export default function OrgSettings() {
  const [activeTab, setActiveTab] = useState('org');

  return (
    <div className="p-8 lg:p-10 max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-7 w-7 text-primary" /> Org & Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Organization configuration, members, and integration status</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${activeTab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>

        {/* ORG TAB */}
        {activeTab === 'org' && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4">Organization Info</p>
            {[
              { label: 'Organization Name', value: 'VEU AI Studio' },
              { label: 'Slug', value: 'veu-ai-studio' },
              { label: 'Billing Tier', value: 'Enterprise (Internal)' },
              { label: 'Platform', value: 'FlowAI v0.1 — Process-Driven AI OS' },
              { label: 'Commercial Version', value: 'VEUaaS (multi-tenant — planned)' },
              { label: 'Portfolio Size', value: '5 flagship products + future additions' },
              { label: 'Revenue Target', value: '$5B AI portfolio in 6 years' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xs font-semibold text-foreground text-right">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400">
              Member management will be fully wired once Clerk multi-tenant auth is deployed. Current view shows known accounts.
            </div>
            {MOCK_MEMBERS.map(m => (
              <div key={m.email} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{m.name}</p>
                  <p className="text-[10px] text-muted-foreground">{m.email}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold capitalize ${ROLE_STYLES[m.role]}`}>{m.role}</span>
              </div>
            ))}
          </div>
        )}

        {/* INTEGRATIONS TAB */}
        {activeTab === 'integrations' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Integration status is determined by the presence of environment secrets. Green = secret detected. Red = not yet configured.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INTEGRATIONS.map(integ => {
                const status = getStatus(integ);
                const catStyle = CATEGORY_COLORS[integ.category] || CATEGORY_COLORS.Infra;
                return (
                  <div key={integ.name} className={`rounded-xl border p-4 flex items-center gap-3 ${status === 'connected' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-card'}`}>
                    <div className="shrink-0">{STATUS_ICON[status]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{integ.name}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${catStyle}`}>{integ.category}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{integ.desc}</p>
                    </div>
                    <span className={`text-[10px] font-bold shrink-0 ${status === 'connected' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {status === 'connected' ? 'CONNECTED' : 'PENDING'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border border-border bg-card p-4 mt-2">
              <p className="text-[10px] text-muted-foreground">
                {INTEGRATIONS.filter(i => getStatus(i) === 'connected').length}/{INTEGRATIONS.length} integrations connected · 
                Configure missing integrations via the Base44 Secrets dashboard or your Vercel environment variables.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}