import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import {
  LayoutTemplate, Search, Zap, Globe, ShoppingCart, BarChart3,
  MessageSquare, Lock, Rocket, ChevronRight, CheckCircle2, Loader2, Star
} from 'lucide-react';

const TEMPLATES = [
  {
    id: 'saas_dashboard',
    name: 'SaaS Dashboard',
    icon: BarChart3,
    color: 'text-primary',
    bg: 'bg-primary/10',
    category: 'SaaS',
    description: 'Full-featured SaaS app with analytics, billing, user management, and admin panel.',
    stack: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
    stages: ['Research', 'Design', 'Build', 'Deploy'],
    popular: true,
    input: 'Build a SaaS dashboard with analytics, subscription billing, user roles, and admin management panel',
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    icon: ShoppingCart,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    category: 'Commerce',
    description: 'Complete online store with product catalog, cart, checkout, and order management.',
    stack: ['React', 'Node.js', 'MongoDB', 'Stripe'],
    stages: ['Research', 'Design', 'Build', 'Deploy'],
    popular: true,
    input: 'Build an e-commerce store with product listings, shopping cart, Stripe checkout, and order tracking',
  },
  {
    id: 'landing_page',
    name: 'Marketing Landing Page',
    icon: Globe,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    category: 'Marketing',
    description: 'High-converting landing page with hero, features, pricing, testimonials, and CTA.',
    stack: ['React', 'Tailwind', 'Vercel'],
    stages: ['Design', 'Build', 'Deploy'],
    popular: false,
    input: 'Build a high-converting SaaS landing page with hero section, feature highlights, pricing table, and email signup',
  },
  {
    id: 'api_service',
    name: 'REST API Service',
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    category: 'Backend',
    description: 'Production-ready REST API with auth, rate limiting, database, and documentation.',
    stack: ['Node.js', 'Express', 'PostgreSQL', 'JWT'],
    stages: ['Research', 'Build', 'Deploy'],
    popular: false,
    input: 'Build a production-ready REST API with JWT authentication, rate limiting, PostgreSQL database, and Swagger documentation',
  },
  {
    id: 'chat_app',
    name: 'Realtime Chat App',
    icon: MessageSquare,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    category: 'Social',
    description: 'Realtime messaging app with channels, DMs, file sharing, and notifications.',
    stack: ['React', 'WebSockets', 'Node.js', 'Redis'],
    stages: ['Research', 'Design', 'Build', 'Deploy'],
    popular: true,
    input: 'Build a realtime chat application with public channels, private DMs, file sharing, and push notifications',
  },
  {
    id: 'auth_system',
    name: 'Auth & User System',
    icon: Lock,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    category: 'Infrastructure',
    description: 'Complete authentication system with OAuth, MFA, roles, sessions, and audit logs.',
    stack: ['Node.js', 'JWT', 'OAuth2', 'PostgreSQL'],
    stages: ['Research', 'Build', 'Deploy'],
    popular: false,
    input: 'Build an authentication system with email/password login, OAuth (Google/GitHub), MFA, role-based access control, and audit logging',
  },
];

const CATEGORIES = ['All', 'SaaS', 'Commerce', 'Marketing', 'Backend', 'Social', 'Infrastructure'];

export default function ProjectTemplates() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [launching, setLaunching] = useState(null);
  const [launched, setLaunched] = useState(null);
  const [customInput, setCustomInput] = useState('');

  const filtered = TEMPLATES.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'All' || t.category === category;
    return matchSearch && matchCategory;
  });

  const launchTemplate = async (template) => {
    setLaunching(template.id);
    try {
      // Create a new Run record
      const user = await base44.auth.me();
      const run = await base44.entities.Run.create({
        user_email: user?.email || 'unknown',
        type: 'pipeline',
        status: 'queued',
        input: template.input,
      });
      setLaunched({ templateId: template.id, runId: run.id });
      // Navigate to pipeline with the template input pre-filled
      setTimeout(() => {
        navigate('/pipeline', { state: { prefill: template.input } });
      }, 1200);
    } catch {
      setLaunching(null);
    }
  };

  const launchCustom = () => {
    if (!customInput.trim()) return;
    navigate('/pipeline', { state: { prefill: customInput } });
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <LayoutTemplate className="h-7 w-7 text-primary" />
          Project Templates
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kickstart your pipeline with a battle-tested template — or build from scratch
        </p>
      </motion.div>

      {/* Custom input */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" /> Start From Scratch
        </p>
        <div className="flex gap-2">
          <Input
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && launchCustom()}
            placeholder='Describe what you want to build, e.g. "A project management app with Kanban boards and time tracking"'
            className="h-9 text-sm"
          />
          <Button size="sm" onClick={launchCustom} disabled={!customInput.trim()} className="gap-1.5 shrink-0">
            <ChevronRight className="h-4 w-4" /> Launch
          </Button>
        </div>
      </motion.div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="h-9 pl-8 text-sm" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${category === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/30 text-muted-foreground border-border hover:text-foreground'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((template, i) => {
            const Icon = template.icon;
            const isLaunching = launching === template.id;
            const isLaunched = launched?.templateId === template.id;
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-border bg-card p-5 space-y-4 flex flex-col hover:border-primary/40 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className={`h-10 w-10 rounded-lg ${template.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${template.color}`} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {template.popular && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                        <Star className="h-2.5 w-2.5" /> Popular
                      </span>
                    )}
                    <span className="text-[9px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">{template.category}</span>
                  </div>
                </div>

                <div className="space-y-1 flex-1">
                  <h3 className="text-sm font-bold text-foreground">{template.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{template.description}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {template.stack.map(s => (
                      <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 border border-border/50 text-muted-foreground">{s}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    {template.stages.map((s, j) => (
                      <span key={s} className="flex items-center gap-1">
                        {s}{j < template.stages.length - 1 && <ChevronRight className="h-2.5 w-2.5" />}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => launchTemplate(template)}
                  disabled={isLaunching || isLaunched}
                  variant={isLaunched ? 'outline' : 'default'}
                >
                  {isLaunching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                   isLaunched  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
                   <Rocket className="h-3.5 w-3.5" />}
                  {isLaunching ? 'Launching...' : isLaunched ? 'Launched!' : 'Use Template'}
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <LayoutTemplate className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No templates match your search</p>
        </div>
      )}
    </div>
  );
}