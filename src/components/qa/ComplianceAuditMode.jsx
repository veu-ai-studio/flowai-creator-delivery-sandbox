import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const FRAMEWORKS = [
  { key: 'wcag_aa', label: 'WCAG 2.1 AA', description: 'Web Content Accessibility Guidelines' },
  { key: 'gdpr', label: 'GDPR', description: 'General Data Protection Regulation' },
  { key: 'owasp', label: 'OWASP Top 10', description: 'Web application security risks' },
  { key: 'iso_25010', label: 'ISO 25010', description: 'Software quality characteristics' },
  { key: 'pci_dss', label: 'PCI DSS', description: 'Payment Card Industry Data Security' },
];

const STATUS_CONFIG = {
  pass: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'Pass' },
  fail: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', label: 'Fail' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', label: 'Warning' },
};

function CheckRow({ check, index }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[check.status] || STATUS_CONFIG.warning;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-lg border p-3 space-y-2 ${cfg.bg}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <Icon className={`h-4 w-4 ${cfg.color} shrink-0 mt-0.5`} />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">{check.criterion}</p>
            <p className="text-[10px] text-muted-foreground">{check.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
          {check.remediation && (
            <button onClick={() => setExpanded(!expanded)} className="p-0.5 rounded hover:bg-background/30">
              {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {expanded && check.remediation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pl-6 text-[10px] text-muted-foreground border-t border-border/30 pt-2"
          >
            <span className="font-semibold text-foreground">Remediation: </span>{check.remediation}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ComplianceAuditMode({ results, crawlData, url }) {
  const [selectedFrameworks, setSelectedFrameworks] = useState(['wcag_aa', 'owasp']);
  const [auditResult, setAuditResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleFramework = (key) => {
    setSelectedFrameworks(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const runComplianceAudit = async () => {
    if (!results) return;
    setLoading(true);
    setAuditResult(null);
    try {
      const selectedLabels = FRAMEWORKS.filter(f => selectedFrameworks.includes(f.key)).map(f => f.label);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a compliance auditor. Evaluate this web application against the selected compliance frameworks.

URL: ${url}
QA Scores: ${JSON.stringify(results.scores)}
Issues found: ${JSON.stringify(results.recommendations?.slice(0, 10))}
Crawl data: links=${crawlData?.links?.length || 0}, forms=${crawlData?.forms || 0}, errors=${crawlData?.errors?.length || 0}

Frameworks to audit against: ${selectedLabels.join(', ')}

For each framework, provide:
1. An overall compliance score (0-100)
2. A list of specific checks with pass/fail/warning status, criterion name, description, and remediation steps

Be specific and realistic based on the available data.`,
        response_json_schema: {
          type: 'object',
          properties: {
            frameworks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  label: { type: 'string' },
                  score: { type: 'number' },
                  passed: { type: 'number' },
                  failed: { type: 'number' },
                  warnings: { type: 'number' },
                  checks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        criterion: { type: 'string' },
                        status: { type: 'string', enum: ['pass', 'fail', 'warning'] },
                        description: { type: 'string' },
                        remediation: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      setAuditResult(res);
    } catch (err) {
      console.error('Compliance audit error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Compliance Audit Mode
        </h2>
        <Button size="sm" className="gap-2" onClick={runComplianceAudit} disabled={loading || !results || selectedFrameworks.length === 0}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {loading ? 'Auditing...' : 'Run Compliance Audit'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Check your application against industry compliance frameworks — WCAG, GDPR, OWASP, ISO 25010, and more.
      </p>

      {/* Framework selector */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Frameworks</p>
        <div className="flex flex-wrap gap-2">
          {FRAMEWORKS.map(f => (
            <button
              key={f.key}
              onClick={() => toggleFramework(f.key)}
              title={f.description}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                selectedFrameworks.includes(f.key)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {auditResult?.frameworks?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {auditResult.frameworks.map((fw, fi) => (
              <div key={fi} className="space-y-3">
                {/* Framework header */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{fw.label}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px]">
                      <span className="text-emerald-400">✓ {fw.passed} passed</span>
                      <span className="text-red-400">✗ {fw.failed} failed</span>
                      <span className="text-amber-400">⚠ {fw.warnings} warnings</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${fw.score >= 80 ? 'text-emerald-400' : fw.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                      {fw.score}%
                    </div>
                    <p className="text-[10px] text-muted-foreground">compliance</p>
                  </div>
                </div>

                {/* Checks */}
                <div className="space-y-2">
                  {fw.checks?.map((check, ci) => (
                    <CheckRow key={ci} check={check} index={ci} />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!auditResult && !loading && (
        <div className="text-center py-6 text-muted-foreground text-xs">
          Select frameworks above and run an audit after completing a QA scan.
        </div>
      )}
    </motion.div>
  );
}