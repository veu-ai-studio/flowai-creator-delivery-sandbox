const NODES = [
  { label: 'ChatGPT', x: 10, y: 38, color: '#10b981', dot: 'bg-emerald-400' },
  { label: 'Research', x: 35, y: 15, color: '#60a5fa', dot: 'bg-blue-400' },
  { label: 'Design', x: 35, y: 62, color: '#a78bfa', dot: 'bg-purple-400' },
  { label: 'Build', x: 60, y: 38, color: '#fb923c', dot: 'bg-orange-400' },
  { label: 'Deploy', x: 83, y: 38, color: '#34d399', dot: 'bg-emerald-400' },
];

const EDGES = [
  [0, 1], [0, 2], [1, 3], [2, 3], [3, 4],
];

const METRICS = [
  { label: 'Flows Run', value: '1,284', delta: '+12%', up: true },
  { label: 'Success Rate', value: '98.2%', delta: '+0.4%', up: true },
  { label: 'Avg. Duration', value: '1.8s', delta: '-0.3s', up: true },
];

const RECENT = [
  { name: 'SaaS Builder Flow', status: 'success', time: '2m ago' },
  { name: 'QA Audit Pipeline', status: 'success', time: '8m ago' },
  { name: 'Research → Design', status: 'running', time: 'now' },
];

export default function DashboardPreview() {
  return (
    <section className="py-24 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Your command center</h2>
          <p className="text-gray-400 max-w-xl mx-auto">A live view of your AI pipelines, metrics, and deployments — all in one place.</p>
        </div>

        {/* Browser chrome wrapper */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1e] shadow-2xl shadow-blue-900/20 overflow-hidden">
          {/* Browser bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/2">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
            </div>
            <div className="flex-1 mx-4">
              <div className="h-6 max-w-xs rounded-md bg-white/5 border border-white/8 flex items-center px-3 gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-gray-400 font-mono">app.flowai.io/dashboard</span>
              </div>
            </div>
          </div>

          {/* Dashboard layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-[420px]">
            {/* Sidebar */}
            <div className="border-r border-white/5 p-4 space-y-1">
              {['Dashboard', 'Flow Designer', 'Run History', 'QA Audit', 'Pipeline', 'Billing'].map((item, i) => (
                <div key={item} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${i === 0 ? 'bg-blue-500/15 text-blue-400 font-semibold' : 'text-gray-500 hover:text-gray-300'}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-blue-400' : 'bg-gray-600'}`} />
                  {item}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="lg:col-span-2 p-5 space-y-4">
              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-3">
                {METRICS.map(m => (
                  <div key={m.label} className="rounded-xl border border-white/6 bg-white/3 p-3">
                    <p className="text-[10px] text-gray-500 mb-1">{m.label}</p>
                    <p className="text-lg font-bold text-white">{m.value}</p>
                    <p className={`text-[10px] font-semibold ${m.up ? 'text-emerald-400' : 'text-red-400'}`}>{m.delta}</p>
                  </div>
                ))}
              </div>

              {/* Pipeline visual */}
              <div className="rounded-xl border border-white/6 bg-white/2 p-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-3">Active Pipeline</p>
                <div className="relative h-28">
                  {/* SVG edges */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    {EDGES.map(([a, b], i) => {
                      const na = NODES[a], nb = NODES[b];
                      return (
                        <line
                          key={i}
                          x1={`${na.x + 6}%`} y1={`${na.y + 8}%`}
                          x2={`${nb.x}%`} y2={`${nb.y + 8}%`}
                          stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"
                        />
                      );
                    })}
                  </svg>
                  {/* Nodes */}
                  {NODES.map((n, i) => (
                    <div
                      key={n.label}
                      className="absolute flex flex-col items-center gap-1"
                      style={{ left: `${n.x}%`, top: `${n.y}%` }}
                    >
                      <div className={`h-8 w-8 rounded-lg border flex items-center justify-center`}
                        style={{ background: n.color + '18', borderColor: n.color + '40' }}>
                        <div className={`h-2 w-2 rounded-full ${n.dot}`} />
                      </div>
                      <span className="text-[9px] text-gray-400 whitespace-nowrap">{n.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent runs */}
              <div className="rounded-xl border border-white/6 bg-white/2 p-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-3">Recent Runs</p>
                <div className="space-y-2">
                  {RECENT.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${r.status === 'success' ? 'bg-emerald-400' : 'bg-blue-400 animate-pulse'}`} />
                        <span className="text-gray-300">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${r.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {r.status}
                        </span>
                        <span className="text-gray-500">{r.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">Live preview of the FlowAI dashboard</p>
      </div>
    </section>
  );
}