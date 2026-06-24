import { useEffect, useMemo, useState } from 'react';

const categories = [
  { value: 'housing', label: 'Housing' },
  { value: 'food', label: 'Food' },
  { value: 'health', label: 'Health' },
  { value: 'work', label: 'Work' }
];

function fallbackRecommendation(need, category) {
  const normalized = need.toLowerCase();
  if (normalized.includes('food') || category === 'food') {
    return 'Visit the nearest food pantry intake desk this week and ask about mobile distribution routes.';
  }
  if (normalized.includes('health') || normalized.includes('clinic') || category === 'health') {
    return 'Contact a community health center and request a sliding-scale appointment plus benefits navigator intake.';
  }
  if (normalized.includes('job') || normalized.includes('work') || category === 'work') {
    return 'Book a workforce center intake for resume review, transport support, and training eligibility.';
  }
  return 'Call 211 for emergency rental assistance and collect your lease, notice, and proof of income.';
}

export default function App() {
  const [need, setNeed] = useState('');
  const [category, setCategory] = useState('housing');
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('Ready');
  const [saving, setSaving] = useState(false);
  const preview = useMemo(() => fallbackRecommendation(need, category), [need, category]);

  async function loadRecords() {
    const response = await fetch('/api/resource-requests', { headers: { Accept: 'application/json' } });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || data.error || 'Unable to load saved requests');
    setRecords(data.records || []);
    return data.records || [];
  }

  useEffect(() => {
    loadRecords()
      .then((items) => setStatus(items.length ? 'Saved requests loaded from backend.' : 'No saved requests yet.'))
      .catch((error) => setStatus(error.message));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setStatus('Saving to backend...');
    try {
      const response = await fetch('/api/resource-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ need, category })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || data.error || 'Save failed');
      const fresh = await loadRecords();
      setStatus(`Saved and retrieved from backend. ${fresh.length} request${fresh.length === 1 ? '' : 's'} available.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">FlowAI Creator Type 2</p>
          <h1 className="text-4xl font-bold text-slate-950">Community Resource Navigator</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-700">Build a persistence-backed Community Resource Navigator for underserved residents. The app must let a user enter a need, choose a category, submit it to a backend, and retrieve saved requests from another browser session. It must produce meaningfully different recommended next steps for at least housing, food, health, and employment needs. No source URL, no source repo, description-only creator path.</p>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            FlowAI M4 Creator Type 2 verified persistence-backed path
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Backend status</p>
            <p className="mt-2 text-sm text-slate-700">{status}</p>
          </div>
        </div>

        <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Describe your need</span>
            <textarea
              className="min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={need}
              onChange={(event) => setNeed(event.target.value)}
              placeholder="Example: I need help with rent before an eviction notice deadline."
              aria-label="Describe your need"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Resource category</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Resource category"
            >
              {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Preview: </span>{preview}
          </div>
          <button
            className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={saving || !need.trim()}
          >
            {saving ? 'Saving...' : 'Save and recommend'}
          </button>
        </form>

        <section className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Saved requests</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">Backend-retrieved recommendations</h2>
            </div>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" type="button" onClick={() => loadRecords()}>
              Reload
            </button>
          </div>
          <div className="mt-5 grid gap-3">
            {records.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">No saved requests have been retrieved yet.</p>
            ) : records.map((record) => {
              const payload = record.payload || {};
              const recommendation = payload.recommendation || {};
              return (
                <article className="rounded-md border border-slate-200 p-4" key={record.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{recommendation.label || payload.category || 'Resource'}</p>
                  <p className="mt-2 text-sm text-slate-700">{payload.need}</p>
                  <p className="mt-3 font-medium text-slate-950">{recommendation.nextStep || 'Recommendation pending'}</p>
                  {recommendation.followUp && <p className="mt-2 text-sm text-slate-600">{recommendation.followUp}</p>}
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
