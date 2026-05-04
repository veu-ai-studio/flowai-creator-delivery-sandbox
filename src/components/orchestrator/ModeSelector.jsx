import { Globe, Lightbulb } from 'lucide-react';

const MODES = [
  {
    id: 'conversion',
    label: 'Mode A — Conversion',
    icon: Globe,
    desc: 'Input an existing app URL. FlowAI analyzes, improves, and redeploys.',
    placeholder: 'https://existing-app.vercel.app',
    inputLabel: 'Existing App URL',
    inputType: 'url',
  },
  {
    id: 'creation',
    label: 'Mode B — Creation',
    icon: Lightbulb,
    desc: 'Describe a product idea. FlowAI builds it end-to-end from scratch.',
    placeholder: 'e.g. A SaaS task manager for remote teams with AI-powered prioritization',
    inputLabel: 'Product Description',
    inputType: 'text',
  },
];

export default function ModeSelector({ mode, setMode, input, setInput, onRun, running }) {
  const current = MODES.find(m => m.id === mode) || MODES[0];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {MODES.map(m => {
          const Icon = m.icon;
          return (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all ${
                mode === m.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-secondary/20 text-muted-foreground hover:border-muted'
              }`}>
              <Icon className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-bold">{m.label}</p>
                <p className="text-[9px] text-muted-foreground">{m.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Input */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase">{current.inputLabel}</label>
        <input
          type={current.inputType}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !running && input.trim() && onRun()}
          placeholder={current.placeholder}
          disabled={running}
          className="w-full h-10 px-3 text-sm rounded-lg bg-secondary/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/40 disabled:opacity-50"
        />
      </div>

      <button
        onClick={onRun}
        disabled={running || !input.trim()}
        className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition">
        {running ? (
          <>
            <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Running Pipeline…
          </>
        ) : '▶ Run Master Orchestration (13 Steps)'}
      </button>
    </div>
  );
}