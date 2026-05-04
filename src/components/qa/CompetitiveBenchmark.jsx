import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, TrendingUp, Plus, X } from 'lucide-react';

export default function CompetitiveBenchmark({ currentResults }) {
  const [competitors, setCompetitors] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(null);

  const handleAddCompetitor = async () => {
    if (!newUrl.trim()) return;

    const id = Date.now();
    setLoading(id);
    setCompetitors((prev) => [...prev, { id, url: newUrl, results: null, loading: true }]);

    try {
      const crawlRes = await base44.functions.invoke('crawlPage', { url: newUrl });
      const analysisRes = await base44.functions.invoke('analyzeQA', {
        crawlData: crawlRes.data,
      });

      setCompetitors((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, results: analysisRes.data, loading: false } : c
        )
      );
    } catch (error) {
      console.error('Competitor crawl error:', error);
      setCompetitors((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, error: error.message, loading: false } : c
        )
      );
    }

    setNewUrl('');
    setLoading(null);
  };

  const handleRemoveCompetitor = (id) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  };

  const getBenchmarkColor = (score) => {
    if (score >= 8) return 'text-emerald-400';
    if (score >= 6) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        Competitive Benchmark
      </h2>

      {/* Add Competitor */}
      <div className="flex gap-2">
        <Input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddCompetitor()}
          placeholder="https://competitor.com"
          className="h-9 text-sm"
          disabled={loading !== null}
        />
        <Button
          size="sm"
          className="gap-1.5"
          onClick={handleAddCompetitor}
          disabled={loading !== null || !newUrl.trim()}
        >
          {loading !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </Button>
      </div>

      {/* Comparison Table */}
      <AnimatePresence>
        {competitors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {/* Header */}
            <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-2 border-b border-border">
              <div>Competitor</div>
              <div className="text-center">Overall</div>
              <div className="text-center">UI/UX</div>
              <div className="text-center">API</div>
              <div className="text-center">Logic</div>
            </div>

            {/* Current Site */}
            {currentResults && (
              <div className="grid grid-cols-5 gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-sm font-semibold text-foreground">Your Site</div>
                <div className={`text-center font-bold ${getBenchmarkColor(currentResults.scores.overall)}`}>
                  {currentResults.scores.overall}/10
                </div>
                <div className={`text-center font-bold ${getBenchmarkColor(currentResults.scores.ui_ux)}`}>
                  {currentResults.scores.ui_ux}/10
                </div>
                <div className={`text-center font-bold ${getBenchmarkColor(currentResults.scores.api)}`}>
                  {currentResults.scores.api}/10
                </div>
                <div className={`text-center font-bold ${getBenchmarkColor(currentResults.scores.logic)}`}>
                  {currentResults.scores.logic}/10
                </div>
              </div>
            )}

            {/* Competitors */}
            {competitors.map((comp) => (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="grid grid-cols-5 gap-2 p-3 rounded-lg bg-secondary/30 items-center group relative"
              >
                <div className="text-sm truncate text-foreground">{comp.url.split('/')[2]}</div>
                {comp.loading ? (
                  <>
                    <div className="col-span-4 flex items-center justify-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Analyzing...</span>
                    </div>
                  </>
                ) : comp.error ? (
                  <div className="col-span-4 text-xs text-red-400">{comp.error}</div>
                ) : comp.results ? (
                  <>
                    <div className={`text-center font-bold ${getBenchmarkColor(comp.results.scores.overall)}`}>
                      {comp.results.scores.overall}/10
                    </div>
                    <div className={`text-center font-bold ${getBenchmarkColor(comp.results.scores.ui_ux)}`}>
                      {comp.results.scores.ui_ux}/10
                    </div>
                    <div className={`text-center font-bold ${getBenchmarkColor(comp.results.scores.api)}`}>
                      {comp.results.scores.api}/10
                    </div>
                    <div className={`text-center font-bold ${getBenchmarkColor(comp.results.scores.logic)}`}>
                      {comp.results.scores.logic}/10
                    </div>
                  </>
                ) : null}
                <button
                  onClick={() => handleRemoveCompetitor(comp.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}