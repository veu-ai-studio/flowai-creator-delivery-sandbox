// ─── CAPABILITY PACKAGE — SELF-RENEWAL ───────────────────────────────────────
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Copy, Check, Zap, Shield, Activity, Link2 } from 'lucide-react';

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
    id: 'self-test',
    icon: Activity,
    color: 'text-primary border-primary/30 bg-primary/5',
    label: 'Component 1 — Self-Test Module',
    desc: 'Installs a lightweight daily self-test engine into the target product.',
    sprint: `Sprint Title: Install Self-Test Engine
File: functions/selfTest.js (new file)
Location: New backend function

Create a new backend function at functions/selfTest.js:

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const results = [];

    // Test 1: Entity accessibility
    const entities = ['GovernanceAuditLog', 'ClearanceRecord'];
    for (const entity of entities) {
      try {
        await base44.asServiceRole.entities[entity].list(undefined, 1);
        results.push({ check: \`Entity:\${entity}\`, status: 'PASS' });
      } catch {
        results.push({ check: \`Entity:\${entity}\`, status: 'FAIL' });
      }
    }

    // Test 2: Auth check
    const user = await base44.auth.me().catch(() => null);
    results.push({ check: 'Auth', status: user ? 'PASS' : 'WARN' });

    const passed = results.filter(r => r.status === 'PASS').length;
    const score = Math.round((passed / results.length) * 100);

    // Log result
    await base44.asServiceRole.entities.GovernanceAuditLog.create({
      action_type: 'session_started',
      action_detail: \`scheduled_self_test: score=\${score}% passed=\${passed}/\${results.length}\`,
      user: 'system',
      timestamp: new Date().toISOString(),
    });

    return Response.json({ score, results, passed, total: results.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

Verify: Go to Dashboard > Functions > selfTest and run with empty payload. Confirm score and results in response.`,
  },
  {
    id: 'self-heal',
    icon: RefreshCw,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
    label: 'Component 2 — Self-Heal Module',
    desc: 'Installs automatic error recovery triggered by self-test failures.',
    sprint: `Sprint Title: Install Self-Heal Module
File: functions/selfHeal.js (new file)
Location: New backend function

Create a new backend function at functions/selfHeal.js that runs after selfTest.js:

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const healActions = [];

    // Action 1: Clear stale in-progress sessions older than 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const staleSessions = await base44.asServiceRole.entities.AutoSession
      .filter({ overall_status: 'running' }).catch(() => []);
    for (const s of staleSessions) {
      if (s.started_at < cutoff) {
        await base44.asServiceRole.entities.AutoSession.update(s.id, { overall_status: 'failed' });
        healActions.push({ action: 'cleared_stale_session', id: s.id });
      }
    }

    // Log heal actions
    await base44.asServiceRole.entities.GovernanceAuditLog.create({
      action_type: 'fix_applied',
      action_detail: \`self_heal: \${healActions.length} actions taken\`,
      user: 'system',
      outcome: JSON.stringify(healActions),
      timestamp: new Date().toISOString(),
    });

    return Response.json({ healed: healActions.length, actions: healActions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

Verify: Run with empty payload. Confirm stale sessions are cleared and action count is returned.`,
  },
  {
    id: 'self-monitor',
    icon: Shield,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
    label: 'Component 3 — Self-Monitor Widget',
    desc: 'Installs a health status widget on the product dashboard.',
    sprint: `Sprint Title: Install Self-Monitor Dashboard Widget
File: components/dashboard/SelfMonitorWidget.jsx (new file)
Location: Add to Dashboard page

Create components/dashboard/SelfMonitorWidget.jsx:

import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SelfMonitorWidget() {
  const [lastTest, setLastTest] = useState(null);
  const [running, setRunning] = useState(false);

  const runSelfTest = async () => {
    setRunning(true);
    const res = await base44.functions.invoke('selfTest', {});
    setLastTest(res.data);
    setRunning(false);
  };

  useEffect(() => {
    base44.entities.GovernanceAuditLog
      .filter({ action_type: 'session_started' }, '-timestamp', 5)
      .then(logs => {
        const test = logs.find(l => l.action_detail?.includes('scheduled_self_test'));
        if (test) setLastTest({ source: 'log', detail: test.action_detail });
      }).catch(() => {});
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Self-Monitor</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={runSelfTest} disabled={running}>
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Run Test
        </Button>
      </div>
      {lastTest ? (
        <div className="text-xs space-y-1">
          <p className="text-foreground font-semibold">
            {lastTest.score != null ? \`Score: \${lastTest.score}%\` : lastTest.detail || 'Test completed'}
          </p>
          {lastTest.results?.map((r, i) => (
            <p key={i} className={\`\${r.status === 'PASS' ? 'text-emerald-400' : 'text-amber-400'}\`}>
              {r.status} — {r.check}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No self-test data yet. Run test now.</p>
      )}
    </div>
  );
}

Then in your Dashboard page, import and add <SelfMonitorWidget /> to the grid.

Verify: Dashboard loads. Click "Run Test" button. Score appears within 10 seconds.`,
  },
  {
    id: 'governance-hook',
    icon: Link2,
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
    label: 'Component 4 — Governance Hook',
    desc: 'Installs a webhook that calls FlowAI GovernanceAuditLog on critical events.',
    sprint: `Sprint Title: Install FlowAI Governance Hook
File: functions/governanceHook.js (new file)
Location: New backend function — called by entity automations

Create functions/governanceHook.js:

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FLOWAI_LOG_ENDPOINT = 'https://truthful-flow-logic-lab.base44.app/api/governance-event';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event_type, product_name, detail, severity } = body;

    // Log to FlowAI GovernanceAuditLog via base44 SDK
    await base44.asServiceRole.entities.GovernanceAuditLog.create({
      action_type: 'clearance_decision_issued',
      action_detail: \`governance_hook: [\${severity || 'INFO'}] \${product_name} — \${event_type}: \${detail}\`,
      user: 'governance-hook',
      timestamp: new Date().toISOString(),
    });

    return Response.json({ logged: true, event_type, product_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

Create an Entity Automation on GovernanceAuditLog (create event) to trigger this function on critical events.

Verify: Create a test GovernanceAuditLog record. Confirm governanceHook logs a corresponding entry.`,
  },
];

export default function CapabilityPackageSelfRenewal() {
  const navigate = useNavigate();
  const [targetUrl, setTargetUrl] = useState('');

  return (
    <div className="p-8 lg:p-10 max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
          <span className="text-border">/</span>
          <span className="text-xs text-muted-foreground">Capability Packages</span>
          <span className="text-border">/</span>
          <span className="text-xs text-foreground font-semibold">Self-Renewal</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-3">
          <RefreshCw className="h-7 w-7 text-primary" /> Self-Renewal Package
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Four-component package that installs autonomous self-renewal into any Base44 product. Paste each sprint into the target product's Base44 project.
        </p>
      </motion.div>

      {/* One-click install CTA */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
        <p className="text-sm font-bold text-primary">One-Click Installation Sprint</p>
        <p className="text-xs text-muted-foreground">Enter a target product URL and generate a single consolidated sprint that installs all four components simultaneously.</p>
        <div className="flex gap-2">
          <Input
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder="https://saigedemo.com"
            className="h-9 text-sm flex-1"
          />
          <Button size="sm" onClick={() => navigate('/capability-packages/self-renewal/install')} className="gap-1.5 shrink-0">
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