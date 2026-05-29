import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Check, Loader2, AlertCircle } from 'lucide-react';

export default function SlackIntegration({ results, url }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('#qa-alerts');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [autoNotify, setAutoNotify] = useState(false);
  const [savedWebhook, setSavedWebhook] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('slack_webhook_url');
    if (saved) { setWebhookUrl(saved); setSavedWebhook(saved); }
    const savedAutoNotify = localStorage.getItem('slack_auto_notify');
    if (savedAutoNotify) setAutoNotify(savedAutoNotify === 'true');
  }, []);

  const handleSave = () => {
    localStorage.setItem('slack_webhook_url', webhookUrl);
    localStorage.setItem('slack_auto_notify', autoNotify.toString());
    setSavedWebhook(webhookUrl);
    setStatus('saved');
    setTimeout(() => setStatus(null), 2000);
  };

  const handleSendReport = async () => {
    if (!webhookUrl || !results) return;
    setSending(true);
    setStatus(null);
    try {
      const score = results.scores?.overall;
      const criticalCount = results.recommendations?.filter(r => r.priority === 'critical').length || 0;
      const emoji = score >= 8 ? '✅' : score >= 6 ? '⚠️' : '🔴';

      const payload = {
        text: `${emoji} *QA Audit Report* — ${url}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${emoji} *QA Audit Complete* for \`${url}\`\n*Overall Score:* ${score}/10 | *Critical Issues:* ${criticalCount}`,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*UI/UX:*\n${results.scores.ui_ux}/10` },
              { type: 'mrkdwn', text: `*API:*\n${results.scores.api}/10` },
              { type: 'mrkdwn', text: `*Logic:*\n${results.scores.logic}/10` },
              { type: 'mrkdwn', text: `*Business Value:*\n${results.scores.business_value}/10` },
            ],
          },
          ...(criticalCount > 0 ? [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Top Issues:*\n${results.recommendations.filter(r => r.priority === 'critical').slice(0, 3).map(r => `• ${r.action}`).join('\n')}`,
            },
          }] : []),
        ],
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        Slack Integration
      </h2>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Webhook URL</label>
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Channel (display only)</label>
          <Input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="#qa-alerts"
            className="h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto_notify"
            checked={autoNotify}
            onChange={(e) => setAutoNotify(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="auto_notify" className="text-sm text-foreground">Auto-notify after every audit</label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleSave} className="gap-2">
          {status === 'saved' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : null}
          Save Config
        </Button>
        <Button
          size="sm"
          onClick={handleSendReport}
          disabled={sending || !webhookUrl || !results}
          className="gap-2"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {sending ? 'Sending...' : 'Send Report to Slack'}
        </Button>
      </div>

      {status === 'success' && (
        <p className="text-xs text-emerald-400 flex items-center gap-1">
          <Check className="h-3 w-3" /> Message sent to Slack
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Failed — check your webhook URL
        </p>
      )}
    </motion.div>
  );
}