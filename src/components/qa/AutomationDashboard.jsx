import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Bell, GitBranch, TestTube, Eye, Settings, Loader2, Check, AlertCircle } from 'lucide-react';

export default function AutomationDashboard({ url, analysisResults }) {
  const [config, setConfig] = useState({
    slack_enabled: false,
    slack_webhook_url: '',
    email_enabled: false,
    email_recipients: [],
    github_enabled: false,
    github_repo: '',
    create_issues_for_critical: true,
    notify_on_score_change: true,
    notify_on_critical_issues: true,
    notify_on_accessibility_failures: true,
  });

  const [newEmail, setNewEmail] = useState('');
  const [running, setRunning] = useState(null);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configs = await base44.entities.NotificationConfig.filter({ url }, null, 1);
        if (configs.length > 0) {
          setConfig(configs[0]);
        }
      } catch (error) {
        console.error('Config load error:', error);
      }
    };
    if (url) loadConfig();
  }, [url]);

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const existing = await base44.entities.NotificationConfig.filter({ url }, null, 1);
      if (existing.length > 0) {
        await base44.entities.NotificationConfig.update(existing[0].id, { ...config, url });
      } else {
        await base44.entities.NotificationConfig.create({ ...config, url });
      }
    } catch (error) {
      console.error('Save config error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAutomation = async (automation) => {
    setRunning(automation);
    try {
      let res;
      switch (automation) {
        case 'accessibility':
          res = await base44.functions.invoke('auditAccessibility', {
            crawlData: analysisResults?.crawl_data,
            reportId: analysisResults?.id,
          });
          break;
        case 'tests':
          res = await base44.functions.invoke('generateTests', {
            crawlData: analysisResults?.crawl_data,
            reportId: analysisResults?.id,
            framework: 'playwright',
          });
          break;
        case 'notify':
          res = await base44.functions.invoke('sendNotifications', {
            url,
            analysis: analysisResults,
            notificationConfig: config,
          });
          break;
        case 'github':
          res = await base44.functions.invoke('syncGitHubIssues', {
            reportId: analysisResults?.id,
            repo: config.github_repo,
            analysis: analysisResults,
          });
          break;
        default:
          res = null;
      }
      setResults((prev) => ({ ...prev, [automation]: res }));
    } catch (error) {
      setResults((prev) => ({ ...prev, [automation]: { error: error.message } }));
    } finally {
      setRunning(null);
    }
  };

  const addEmail = () => {
    if (newEmail.trim()) {
      setConfig((prev) => ({
        ...prev,
        email_recipients: [...prev.email_recipients, newEmail],
      }));
      setNewEmail('');
    }
  };

  const removeEmail = (email) => {
    setConfig((prev) => ({
      ...prev,
      email_recipients: prev.email_recipients.filter((e) => e !== email),
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-6"
    >
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        Automation Control Center
      </h2>

      {/* Configuration Section */}
      <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
        <h3 className="text-sm font-semibold text-foreground">Configuration</h3>

        {/* Email */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="email_enabled"
              checked={config.email_enabled}
              onChange={(e) => setConfig({ ...config, email_enabled: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor="email_enabled" className="text-sm text-foreground">Email Notifications</label>
          </div>
          {config.email_enabled && (
            <div className="ml-6 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="h-8 text-xs flex-1"
                />
                <Button size="sm" onClick={addEmail} className="h-8">Add</Button>
              </div>
              <div className="space-y-1">
                {config.email_recipients.map((email) => (
                  <div key={email} className="flex items-center justify-between text-xs p-2 rounded bg-background/50 border border-border/30">
                    <span>{email}</span>
                    <button onClick={() => removeEmail(email)} className="text-destructive hover:text-destructive/80">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Slack */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="slack_enabled"
              checked={config.slack_enabled}
              onChange={(e) => setConfig({ ...config, slack_enabled: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor="slack_enabled" className="text-sm text-foreground">Slack Webhook</label>
          </div>
          {config.slack_enabled && (
            <Input
              value={config.slack_webhook_url}
              onChange={(e) => setConfig({ ...config, slack_webhook_url: e.target.value })}
              placeholder="https://hooks.slack.com/services/..."
              className="ml-6 h-8 text-xs"
            />
          )}
        </div>

        {/* GitHub */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="github_enabled"
              checked={config.github_enabled}
              onChange={(e) => setConfig({ ...config, github_enabled: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor="github_enabled" className="text-sm text-foreground">GitHub Sync</label>
          </div>
          {config.github_enabled && (
            <Input
              value={config.github_repo}
              onChange={(e) => setConfig({ ...config, github_repo: e.target.value })}
              placeholder="owner/repo"
              className="ml-6 h-8 text-xs"
            />
          )}
        </div>

        <Button size="sm" onClick={handleSaveConfig} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Settings className="h-3 w-3" />}
          Save Configuration
        </Button>
      </div>

      {/* Automation Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleRunAutomation('accessibility')}
          disabled={running || !analysisResults}
          className="p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors disabled:opacity-50 space-y-1 text-left"
        >
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            {running === 'accessibility' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          </div>
          <p className="text-xs font-semibold text-foreground">Accessibility Audit</p>
          <p className="text-[10px] text-muted-foreground">WCAG 2.1 scan</p>
        </button>

        <button
          onClick={() => handleRunAutomation('tests')}
          disabled={running || !analysisResults}
          className="p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors disabled:opacity-50 space-y-1 text-left"
        >
          <div className="flex items-center gap-2">
            <TestTube className="h-4 w-4 text-primary" />
            {running === 'tests' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          </div>
          <p className="text-xs font-semibold text-foreground">Generate Tests</p>
          <p className="text-[10px] text-muted-foreground">E2E test code</p>
        </button>

        <button
          onClick={() => handleRunAutomation('notify')}
          disabled={running || !analysisResults || (!config.email_enabled && !config.slack_enabled)}
          className="p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors disabled:opacity-50 space-y-1 text-left"
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            {running === 'notify' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          </div>
          <p className="text-xs font-semibold text-foreground">Send Notifications</p>
          <p className="text-[10px] text-muted-foreground">Email & Slack</p>
        </button>

        <button
          onClick={() => handleRunAutomation('github')}
          disabled={running || !analysisResults || !config.github_enabled}
          className="p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors disabled:opacity-50 space-y-1 text-left"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            {running === 'github' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          </div>
          <p className="text-xs font-semibold text-foreground">Sync to GitHub</p>
          <p className="text-[10px] text-muted-foreground">Create issues</p>
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {Object.entries(results).map(([key, result]) =>
          result ? (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`p-3 rounded-lg border text-xs space-y-1 ${
                result.error
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}
            >
              <div className="flex items-start gap-2">
                {result.error ? (
                  <AlertCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <Check className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <span className={result.error ? 'text-destructive' : 'text-emerald-400'}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}: {result.error || 'Success'}
                </span>
              </div>
            </motion.div>
          ) : null
        )}
      </AnimatePresence>
    </motion.div>
  );
}