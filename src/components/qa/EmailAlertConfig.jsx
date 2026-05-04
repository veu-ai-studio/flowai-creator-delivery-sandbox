import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, Save, Loader2 } from 'lucide-react';

export default function EmailAlertConfig({ url }) {
  const [email, setEmail] = useState('');
  const [triggers, setTriggers] = useState({
    on_score_drop: false,
    score_drop_threshold: 2,
    on_critical_issues: false,
    on_audit_complete: false,
    batch_digest_hours: 24,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!email.trim()) return;
    setSaving(true);
    try {
      await base44.entities.AlertConfig.create({
        url,
        email,
        triggers,
        enabled: true,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Alert config error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Email Alerts</h2>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">Email Address</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="h-9"
          />
        </div>

        <div className="space-y-2 p-3 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="score_drop"
              checked={triggers.on_score_drop}
              onChange={(e) => setTriggers({ ...triggers, on_score_drop: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor="score_drop" className="text-sm text-foreground">
              Alert when score drops by
            </label>
            <Input
              type="number"
              value={triggers.score_drop_threshold}
              onChange={(e) => setTriggers({ ...triggers, score_drop_threshold: parseInt(e.target.value) })}
              className="h-7 w-16 text-xs"
              min="1"
              max="10"
            />
            <span className="text-xs text-muted-foreground">points</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/50">
          <input
            type="checkbox"
            id="critical"
            checked={triggers.on_critical_issues}
            onChange={(e) => setTriggers({ ...triggers, on_critical_issues: e.target.checked })}
            className="h-4 w-4"
          />
          <label htmlFor="critical" className="text-sm text-foreground">Alert on critical issues</label>
        </div>

        <div className="space-y-2 p-3 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="complete"
              checked={triggers.on_audit_complete}
              onChange={(e) => setTriggers({ ...triggers, on_audit_complete: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor="complete" className="text-sm text-foreground">
              Digest every
            </label>
            <Input
              type="number"
              value={triggers.batch_digest_hours}
              onChange={(e) => setTriggers({ ...triggers, batch_digest_hours: parseInt(e.target.value) })}
              className="h-7 w-16 text-xs"
              min="1"
              max="168"
            />
            <span className="text-xs text-muted-foreground">hours</span>
          </div>
        </div>
      </div>

      <Button
        size="sm"
        className="w-full gap-2"
        onClick={handleSave}
        disabled={saving || !email.trim()}
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {saved ? '✓ Saved' : 'Save Alert Config'}
      </Button>
    </motion.div>
  );
}