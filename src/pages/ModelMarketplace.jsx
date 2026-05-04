import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Star, Zap, Brain, Code2, Eye, MessageSquare,
  Image, Music, FileText, Filter, ExternalLink, CheckCircle2, Lock
} from 'lucide-react';

const CATEGORIES = ['All', 'Text', 'Code', 'Vision', 'Audio', 'Multimodal'];

const MODELS = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    category: 'Multimodal',
    description: 'Most capable multimodal model. Handles text, vision, and audio natively.',
    tags: ['text', 'vision', 'audio'],
    rating: 4.9,
    speed: 'Fast',
    cost: '$0.005/1K tokens',
    context: '128K',
    icon: Brain,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    badge: 'Popular',
    badgeColor: 'bg-emerald-500/20 text-emerald-400',
    integrated: true,
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    category: 'Text',
    description: 'Best balance of intelligence and speed. Excels at analysis and long documents.',
    tags: ['text', 'code', 'analysis'],
    rating: 4.8,
    speed: 'Fast',
    cost: '$0.003/1K tokens',
    context: '200K',
    icon: MessageSquare,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    badge: 'Integrated',
    badgeColor: 'bg-blue-500/20 text-blue-400',
    integrated: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    category: 'Text',
    description: 'Fast and affordable. Great for high-volume tasks and structured outputs.',
    tags: ['text', 'code'],
    rating: 4.6,
    speed: 'Very Fast',
    cost: '$0.00015/1K tokens',
    context: '128K',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'Budget',
    badgeColor: 'bg-amber-500/20 text-amber-400',
    integrated: true,
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    category: 'Text',
    description: 'Most powerful Claude model for highly complex tasks requiring deep reasoning.',
    tags: ['text', 'reasoning', 'analysis'],
    rating: 4.7,
    speed: 'Moderate',
    cost: '$0.015/1K tokens',
    context: '200K',
    icon: Brain,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    badge: 'Premium',
    badgeColor: 'bg-purple-500/20 text-purple-400',
    integrated: false,
  },
  {
    id: 'codestral',
    name: 'Codestral',
    provider: 'Mistral',
    category: 'Code',
    description: 'State-of-the-art code generation model supporting 80+ programming languages.',
    tags: ['code', 'completion'],
    rating: 4.5,
    speed: 'Fast',
    cost: '$0.001/1K tokens',
    context: '32K',
    icon: Code2,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    badge: 'New',
    badgeColor: 'bg-sky-500/20 text-sky-400',
    integrated: false,
  },
  {
    id: 'gemini-1-5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    category: 'Multimodal',
    description: 'Google\'s flagship model with 1M token context. Best for massive documents.',
    tags: ['text', 'vision', 'long-context'],
    rating: 4.6,
    speed: 'Moderate',
    cost: '$0.0035/1K tokens',
    context: '1M',
    icon: Eye,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    badge: 'Longest Context',
    badgeColor: 'bg-red-500/20 text-red-400',
    integrated: false,
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    category: 'Vision',
    description: 'Generate high-quality images from text prompts with precise control.',
    tags: ['image', 'generation'],
    rating: 4.7,
    speed: 'Moderate',
    cost: '$0.04/image',
    context: 'N/A',
    icon: Image,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    badge: 'Image Gen',
    badgeColor: 'bg-pink-500/20 text-pink-400',
    integrated: true,
  },
  {
    id: 'whisper',
    name: 'Whisper Large v3',
    provider: 'OpenAI',
    category: 'Audio',
    description: 'State-of-the-art speech recognition supporting 99 languages with high accuracy.',
    tags: ['audio', 'transcription', 'translation'],
    rating: 4.8,
    speed: 'Fast',
    cost: '$0.006/min',
    context: 'N/A',
    icon: Music,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    badge: 'Speech',
    badgeColor: 'bg-violet-500/20 text-violet-400',
    integrated: false,
  },
  {
    id: 'llama-3-70b',
    name: 'Llama 3 70B',
    provider: 'Meta (via Groq)',
    category: 'Text',
    description: 'Open-source powerhouse running at ultra-low latency on Groq hardware.',
    tags: ['text', 'open-source'],
    rating: 4.4,
    speed: 'Blazing Fast',
    cost: '$0.0006/1K tokens',
    context: '8K',
    icon: FileText,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    badge: 'Open Source',
    badgeColor: 'bg-orange-500/20 text-orange-400',
    integrated: false,
  },
];

const SPEED_COLOR = {
  'Blazing Fast': 'text-emerald-400',
  'Very Fast': 'text-emerald-400',
  'Fast': 'text-blue-400',
  'Moderate': 'text-amber-400',
};

function ModelCard({ model, onSelect, selected }) {
  const Icon = model.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      onClick={() => onSelect(model)}
      className={`rounded-xl border p-5 cursor-pointer transition-all hover:shadow-lg ${
        selected?.id === model.id
          ? `${model.border} ${model.bg} shadow-md`
          : 'border-border bg-card hover:border-border/80'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${model.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${model.color}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{model.name}</p>
            <p className="text-[10px] text-muted-foreground">{model.provider}</p>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${model.badgeColor} ${model.border}`}>
          {model.badge}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{model.description}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {model.tags.map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">{tag}</span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/40 text-[10px]">
        <div>
          <p className="text-muted-foreground/60">Speed</p>
          <p className={`font-semibold ${SPEED_COLOR[model.speed] || 'text-foreground'}`}>{model.speed}</p>
        </div>
        <div>
          <p className="text-muted-foreground/60">Context</p>
          <p className="font-semibold text-foreground">{model.context}</p>
        </div>
        <div>
          <p className="text-muted-foreground/60">Stars</p>
          <p className="font-semibold text-amber-400 flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-amber-400" />{model.rating}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs font-mono text-muted-foreground">{model.cost}</span>
        {model.integrated
          ? <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 className="h-3 w-3" />Integrated</span>
          : <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Lock className="h-3 w-3" />API Key needed</span>
        }
      </div>
    </motion.div>
  );
}

function ModelDetail({ model, onClose }) {
  const Icon = model.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`rounded-xl border p-6 space-y-5 ${model.bg} ${model.border}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-xl ${model.bg} border ${model.border} flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${model.color}`} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{model.name}</h2>
            <p className="text-xs text-muted-foreground">{model.provider}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{model.description}</p>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Speed', value: model.speed },
          { label: 'Context Window', value: model.context },
          { label: 'Cost', value: model.cost },
          { label: 'Rating', value: `${model.rating}/5` },
          { label: 'Category', value: model.category },
          { label: 'Status', value: model.integrated ? 'Integrated' : 'Requires API Key' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-card/60 border border-border/40 p-3">
            <p className="text-[10px] text-muted-foreground/70 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {model.tags.map(tag => (
          <span key={tag} className={`text-xs px-2.5 py-1 rounded-full font-medium border ${model.badgeColor} ${model.border}`}>{tag}</span>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        {model.integrated ? (
          <Button className="flex-1 gap-2">
            <Zap className="h-4 w-4" /> Use in Flow
          </Button>
        ) : (
          <Button variant="outline" className="flex-1 gap-2">
            <ExternalLink className="h-4 w-4" /> Get API Key
          </Button>
        )}
        <Button variant="outline" className="gap-2">
          <Star className="h-4 w-4" /> Save
        </Button>
      </div>
    </motion.div>
  );
}

export default function ModelMarketplace() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);

  const filtered = MODELS.filter(m => {
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.provider.toLowerCase().includes(search.toLowerCase()) || m.tags.some(t => t.includes(search.toLowerCase()));
    const matchesCategory = category === 'All' || m.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-8 lg:p-10 max-w-7xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" />
          AI Model Marketplace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse, compare, and integrate AI models into your FlowAI pipelines.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div className="grid grid-cols-3 gap-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {[
          { label: 'Available Models', value: MODELS.length, color: 'text-primary' },
          { label: 'Integrated', value: MODELS.filter(m => m.integrated).length, color: 'text-emerald-400' },
          { label: 'Providers', value: [...new Set(MODELS.map(m => m.provider))].length, color: 'text-blue-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Search & Filter */}
      <motion.div className="flex flex-col sm:flex-row gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search models, providers, or capabilities..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-secondary/30 border border-border">
          <Filter className="h-4 w-4 text-muted-foreground self-center ml-1" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                category === cat ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Grid + Detail */}
      <div className={`grid gap-6 ${selected ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        <div className={`grid gap-4 ${selected ? 'lg:col-span-2 grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          <AnimatePresence mode="popLayout">
            {filtered.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                selected={selected}
                onSelect={m => setSelected(prev => prev?.id === m.id ? null : m)}
              />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16">
              <Brain className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No models match your search</p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {selected && (
            <div className="lg:col-span-1">
              <ModelDetail model={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}