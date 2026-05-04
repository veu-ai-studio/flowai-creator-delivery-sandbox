import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GitBranch, Play, Copy, Check, ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

const PIPELINE_TEMPLATES = [
  {
    name: 'GitHub Actions',
    file: '.github/workflows/qa-audit.yml',
    code: 'name: QA Audit\non:\n  push:\n    branches: [main, develop]\n  pull_request:\n\njobs:\n  qa-audit:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - name: Run QA Audit\n        run: |\n          curl -X POST "${{ secrets.QA_WEBHOOK_URL }}" \\\n            -H "Content-Type: application/json" \\\n            -d \'{"url": "${{ vars.TARGET_URL }}", "branch": "${{ github.ref_name }}", "commit": "${{ github.sha }}"}\'\n',
  },
  {
    name: 'GitLab CI',
    file: '.gitlab-ci.yml',
    code: `qa-audit:
  stage: test
  script:
    - curl -X POST "$QA_WEBHOOK_URL"
        -H "Content-Type: application/json"
        -d "{\\"url\\": \\"$TARGET_URL\\", \\"branch\\": \\"$CI_COMMIT_BRANCH\\", \\"commit\\": \\"$CI_COMMIT_SHA\\"}"
  only:
    - main
    - develop
`,
  },
  {
    name: 'Jenkins',
    file: 'Jenkinsfile',
    code: `pipeline {
  agent any
  stages {
    stage('QA Audit') {
      steps {
        sh '''
          curl -X POST "\${QA_WEBHOOK_URL}" \\
            -H "Content-Type: application/json" \\
            -d "{\\"url\\": \\"\${TARGET_URL}\\", \\"branch\\": \\"\${BRANCH_NAME}\\"}"
        '''
      }
    }
  }
}
`,
  },
];

export default function CICDHookPanel({ url, results }) {
  const [webhookSecret, setWebhookSecret] = useState('');
  const [thresholds, setThresholds] = useState({ overall: 6, critical_max: 2 });
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [copied, setCopied] = useState(null);
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const webhookUrl = `${window.location.origin}/functions/cicdWebhook?secret=${webhookSecret || 'YOUR_SECRET'}`;

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTestThresholds = () => {
    if (!results) return;
    const pass = results.scores.overall >= thresholds.overall;
    const criticalCount = results.recommendations?.filter(r => r.priority === 'critical').length || 0;
    const critPass = criticalCount <= thresholds.critical_max;
    setTestResult({ pass: pass && critPass, score: results.scores.overall, criticalCount, thresholds });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          CI/CD Pipeline Hook
        </h2>
        <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-secondary">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>

      {/* Quality Gate */}
      <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Quality Gates</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Min Overall Score</label>
            <Input
              type="number"
              value={thresholds.overall}
              onChange={(e) => setThresholds({ ...thresholds, overall: parseFloat(e.target.value) })}
              min="0" max="10" step="0.5"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Max Critical Issues</label>
            <Input
              type="number"
              value={thresholds.critical_max}
              onChange={(e) => setThresholds({ ...thresholds, critical_max: parseInt(e.target.value) })}
              min="0" max="20"
              className="h-8 text-sm"
            />
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={handleTestThresholds} disabled={!results}>
          <Play className="h-3 w-3" />
          Test Gates Against Current Results
        </Button>
        <AnimatePresence>
          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-3 rounded-lg border text-xs ${testResult.pass ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
            >
              {testResult.pass ? '✅ PASS' : '❌ FAIL'} — Score: {testResult.score}/10,{' '}
              Critical: {testResult.criticalCount} (max {testResult.thresholds.critical_max})
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Webhook URL */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground block">Webhook Secret</label>
        <Input
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          placeholder="my-secret-token"
          className="h-9 text-sm"
        />
        <div className="flex items-center gap-2 p-2 rounded bg-secondary/30 border border-border/50">
          <code className="text-[10px] text-muted-foreground flex-1 truncate">{webhookUrl}</code>
          <button onClick={() => handleCopy(webhookUrl, 'webhook')} className="shrink-0">
            {copied === 'webhook' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />}
          </button>
        </div>
      </div>

      {/* Pipeline Templates */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Pipeline Templates</p>
            <div className="flex gap-2">
              {PIPELINE_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedTemplate(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedTemplate === i ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className="relative">
              <pre className="text-[10px] bg-background rounded-lg p-3 overflow-x-auto text-muted-foreground border border-border max-h-48 overflow-y-auto">
                {PIPELINE_TEMPLATES[selectedTemplate].code.replace('${{ secrets.QA_WEBHOOK_URL }}', webhookUrl)}
              </pre>
              <button
                onClick={() => handleCopy(PIPELINE_TEMPLATES[selectedTemplate].code, 'code')}
                className="absolute top-2 right-2 p-1.5 rounded bg-secondary hover:bg-accent transition-colors"
              >
                {copied === 'code' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">Save as: <code className="bg-secondary/50 px-1 rounded">{PIPELINE_TEMPLATES[selectedTemplate].file}</code></p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-primary hover:underline"
      >
        {expanded ? 'Hide pipeline templates ↑' : 'Show pipeline templates ↓'}
      </button>
    </motion.div>
  );
}