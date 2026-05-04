import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BookOpen, Zap, Search, ArrowRight } from 'lucide-react';

const TEMPLATES = [
  {
    name: 'SaaS MVP Builder',
    desc: 'Research → Design → Build → Deploy a SaaS product end-to-end.',
    tags: ['Full Lifecycle', 'SaaS'],
    color: 'text-blue-400',
    prompt: 'Build and deploy a SaaS MVP for project management with user auth, dashboards, and billing.',
  },
  {
    name: 'QA Audit + Fix Loop',
    desc: 'Audit a live URL, generate AI fixes, and re-audit to verify improvement.',
    tags: ['QA', 'Automation'],
    color: 'text-emerald-400',
    prompt: 'Run a full QA audit on my app, identify critical issues, generate fixes, and validate.',
  },
  {
    name: 'Competitive Research',
    desc: 'Deep competitive analysis, market sizing, and opportunity mapping.',
    tags: ['Research', 'Strategy'],
    color: 'text-purple-400',
    prompt: 'Conduct competitive research on the project management SaaS market and identify key opportunities.',
  },
  {
    name: 'API Service Deployment',
    desc: 'Design, build, and deploy a RESTful API with authentication and docs.',
    tags: ['Build', 'API'],
    color: 'text-amber-400',
    prompt: 'Design and deploy a RESTful API service with JWT auth, rate limiting, and auto-generated docs.',
  },
  {
    name: 'E-commerce Store',
    desc: 'Full e-commerce pipeline from product design to live Stripe checkout.',
    tags: ['Full Lifecycle', 'E-commerce'],
    color: 'text-pink-400',
    prompt: 'Build and deploy an e-commerce store with product catalog, cart, and Stripe payments.',
  },
  {
    name: 'AI Agent Workflow',
    desc: 'Build a multi-agent orchestration pipeline with specialized agent roles.',
    tags: ['Agents', 'AI'],
    color: 'text-cyan-400',
    prompt: 'Create a multi-agent system with research, writing, and QA agents working in parallel.',
  },
];

export default function TemplatLibraryPanel({ onUseTemplate }) {
  const [search, setSearch] = useState('');
  const filtered = TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-4 rounded-lg border border-border bg-card">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-lg border border-border bg-card p-4 space-y-3 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`text-sm font-bold ${t.color}`}>{t.name}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.desc}</p>
              </div>
              <BookOpen className={`h-4 w-4 shrink-0 mt-0.5 ${t.color}`} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {t.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">{tag}</span>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs h-7"
                onClick={() => onUseTemplate && onUseTemplate(t.prompt)}
              >
                Use <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Zap className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No templates match "{search}"</p>
        </div>
      )}
    </div>
  );
}