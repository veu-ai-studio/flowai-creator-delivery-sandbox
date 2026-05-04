import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Plus, Trash2, Check } from 'lucide-react';

export default function CustomRuleConfig({ onRulesChange }) {
  const [rules, setRules] = useState({
    ui_ux_weight: 25,
    api_weight: 25,
    logic_weight: 25,
    business_value_weight: 25,
  });
  const [newRule, setNewRule] = useState({ name: '', weight: 10 });
  const [expanded, setExpanded] = useState(false);

  const handleWeightChange = (key, value) => {
    const updated = { ...rules, [key]: Math.max(0, Math.min(100, parseInt(value) || 0)) };
    setRules(updated);
    onRulesChange?.(updated);
  };

  const handleAddRule = () => {
    if (newRule.name.trim()) {
      const key = newRule.name.toLowerCase().replace(/\s+/g, '_');
      setRules({ ...rules, [key]: newRule.weight });
      setNewRule({ name: '', weight: 10 });
    }
  };

  const handleDeleteRule = (key) => {
    const updated = { ...rules };
    delete updated[key];
    setRules(updated);
    onRulesChange?.(updated);
  };

  const totalWeight = Object.values(rules).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-4 space-y-4"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Scoring Weights</span>
        </div>
        <span className={`text-xs text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 pt-2"
          >
            {/* Standard weights */}
            {Object.entries(rules)
              .filter(([k]) => ['ui_ux_weight', 'api_weight', 'logic_weight', 'business_value_weight'].includes(k))
              .map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground w-24">{key.replace('_weight', '').replace(/_/g, ' ')}</label>
                  <Input
                    type="number"
                    value={val}
                    onChange={(e) => handleWeightChange(key, e.target.value)}
                    className="h-7 w-16 text-xs"
                    min="0"
                    max="100"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              ))}

            {/* Custom rules */}
            {Object.entries(rules)
              .filter(([k]) => !['ui_ux_weight', 'api_weight', 'logic_weight', 'business_value_weight'].includes(k))
              .map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 p-2 rounded bg-secondary/30 border border-border/50">
                  <span className="text-xs text-foreground flex-1 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-muted-foreground">{val}%</span>
                  <button
                    onClick={() => handleDeleteRule(key)}
                    className="p-1 hover:bg-destructive/20 rounded transition-colors"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}

            {/* Add custom rule */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="Rule name"
                  className="h-7 text-xs"
                />
                <Input
                  type="number"
                  value={newRule.weight}
                  onChange={(e) => setNewRule({ ...newRule, weight: parseInt(e.target.value) || 0 })}
                  className="h-7 w-16 text-xs"
                  min="0"
                  max="100"
                />
                <Button size="sm" className="h-7 gap-1" onClick={handleAddRule}>
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
            </div>

            {/* Total weight indicator */}
            <div className="flex items-center justify-between p-2 rounded bg-primary/10 border border-primary/20">
              <span className="text-xs font-semibold text-primary">Total Weight</span>
              <span className={`text-sm font-bold ${totalWeight === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {totalWeight}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}