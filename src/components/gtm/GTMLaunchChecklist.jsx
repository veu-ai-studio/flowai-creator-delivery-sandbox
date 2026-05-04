import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Square, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

const CHECKLIST = [
  {
    category: 'SEO & Discoverability',
    color: 'text-blue-400',
    items: ['Meta title & description set', 'OG tags configured', 'Sitemap submitted to Google', 'robots.txt reviewed', 'Canonical URLs in place'],
  },
  {
    category: 'Analytics & Tracking',
    color: 'text-purple-400',
    items: ['Google Analytics / Plausible installed', 'Conversion events firing', 'UTM parameters tested', 'Heatmap tool active (Hotjar/Clarity)'],
  },
  {
    category: 'Messaging & Copy',
    color: 'text-emerald-400',
    items: ['Hero headline finalized', 'Value proposition clear in <5 sec', 'CTA buttons prominent', 'Social proof / testimonials visible', 'Pricing page reviewed'],
  },
  {
    category: 'Technical Readiness',
    color: 'text-amber-400',
    items: ['Core Web Vitals passing', 'Mobile responsive', 'HTTPS enabled', 'Error pages (404/500) set up', 'Uptime monitoring active'],
  },
  {
    category: 'Distribution Channels',
    color: 'text-pink-400',
    items: ['Product Hunt draft ready', 'Launch email sequence queued', 'Social posts scheduled', 'Community posts drafted (HN, Reddit)', 'Press kit available'],
  },
];

export default function GTMLaunchChecklist() {
  const [checked, setChecked] = useState({});
  const [expanded, setExpanded] = useState({ 'SEO & Discoverability': true });

  const toggle = (cat, item) => {
    const key = `${cat}::${item}`;
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCat = (cat) => setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));

  const totalItems = CHECKLIST.reduce((a, c) => a + c.items.length, 0);
  const doneCount = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((doneCount / totalItems) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" /> GTM Launch Checklist
        </h3>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-28 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-xs font-bold ${pct === 100 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
            {doneCount}/{totalItems}
          </span>
        </div>
      </div>

      {pct === 100 && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5" /> All checks complete — ready to launch!
        </motion.div>
      )}

      <div className="space-y-2">
        {CHECKLIST.map(({ category, color, items }) => {
          const catDone = items.filter(item => checked[`${category}::${item}`]).length;
          return (
            <div key={category} className="rounded-lg border border-border overflow-hidden">
              <button onClick={() => toggleCat(category)}
                className="w-full flex items-center justify-between px-3 py-2 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${color}`}>{category}</span>
                  <span className="text-[10px] text-muted-foreground">{catDone}/{items.length}</span>
                </div>
                {expanded[category] ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {expanded[category] && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 py-2 space-y-1.5">
                      {items.map(item => {
                        const key = `${category}::${item}`;
                        const done = !!checked[key];
                        return (
                          <button key={item} onClick={() => toggle(category, item)}
                            className="w-full flex items-center gap-2 text-left group">
                            {done
                              ? <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                              : <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />}
                            <span className={`text-xs transition-colors ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}