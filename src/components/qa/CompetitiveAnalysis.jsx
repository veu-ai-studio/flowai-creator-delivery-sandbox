import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Swords, Plus, Loader2, X } from 'lucide-react';

export default function CompetitiveAnalysis({ yourResults, yourUrl }) {
  const [competitors, setCompetitors] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(null);

  const handleAnalyzeCompetitor = async () => {
    if (!newUrl.trim()) return;

    const id = Date.now();
    setLoading(id);
    setCompetitors((prev) => [...prev, { id, url: newUrl, loading: true, data: null }]);

    try {
      const crawlRes = await base44.functions.invoke('crawlPage', { url: newUrl });
      const analysisRes = await base44.functions.invoke('analyzeQA', { crawlData: crawlRes.data });

      // Calculate gaps
      const gaps = {};
      Object.keys(yourResults.scores).forEach((layer) => {
        gaps[layer] = (yourResults.scores[layer] - analysisRes.data.scores[layer]).toFixed(1);
      });

      await base44.entities.CompetitorBenchmark.create({
        your_site_url: yourUrl,
        competitor_url: newUrl,
        your_scores: yourResults.scores,
        competitor_scores: analysisRes.data.scores,
        gaps,
      });

      setCompetitors((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                id,
                url: newUrl,
                loading: false,
                data: {
                  your_scores: yourResults.scores,
                  competitor_scores: analysisRes.data.scores,
                  gaps,
                },
              }
            : c
        )
      );
    } catch (error) {
      console.error('Competitor analysis error:', error);
      setCompetitors((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, loading: false, error: error.message } : c
        )
      );
    }
    setNewUrl('');
    setLoading(null);
  };

  const chartData = competitors.reduce((acc, comp) => {
    if (comp.data) {
      acc.push({
        name: comp.url.split('/')[2].slice(0, 15),
        your_overall: yourResults.scores.overall,
        competitor_overall: comp.data.competitor_scores.overall,
      });
    }
    return acc;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Swords className="h-5 w-5 text-primary" />
        Competitive Landscape Analysis
      </h2>

      {/* Add competitor */}
      <div className="flex gap-2">
        <Input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAnalyzeCompetitor()}
          placeholder="https://competitor.com"
          className="h-9 text-sm flex-1"
          disabled={loading !== null}
        />
        <Button
          size="sm"
          className="gap-1.5"
          onClick={handleAnalyzeCompetitor}
          disabled={loading !== null || !newUrl.trim()}
        >
          {loading !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Analyze
        </Button>
      </div>

      {/* Comparison chart */}
      <AnimatePresence>
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground">Overall Score Comparison</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
                <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Bar dataKey="your_overall" fill="hsl(var(--primary))" name="Your Site" />
                <Bar dataKey="competitor_overall" fill="hsl(var(--chart-2))" name="Competitor" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Competitor details */}
      <AnimatePresence>
        {competitors.map((comp, i) => (
          <motion.div
            key={comp.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground truncate">{comp.url}</span>
              <button
                onClick={() => setCompetitors((prev) => prev.filter((c) => c.id !== comp.id))}
                className="p-1 hover:bg-destructive/20 rounded transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>

            {comp.loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing...
              </div>
            )}

            {comp.error && <p className="text-xs text-destructive">{comp.error}</p>}

            {comp.data && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-background/50 border border-border/30">
                  <p className="text-muted-foreground">Overall</p>
                  <p className="font-bold text-foreground">Your: {comp.data.your_scores.overall}</p>
                  <p className="font-bold text-foreground">Them: {comp.data.competitor_scores.overall}</p>
                  <p className={`font-semibold ${comp.data.gaps.overall > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {comp.data.gaps.overall > 0 ? '+' : ''}{comp.data.gaps.overall}
                  </p>
                </div>
                <div className="p-2 rounded bg-background/50 border border-border/30 space-y-1">
                  <p className="text-muted-foreground">Top Gap</p>
                  {Object.entries(comp.data.gaps)
                    .filter(([k]) => k !== 'overall')
                    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0] && (
                    <>
                      <p className="font-bold text-foreground">
                        {Object.entries(comp.data.gaps)
                          .filter(([k]) => k !== 'overall')
                          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0][0].replace(/_/g, ' ')}
                      </p>
                      <p className="font-semibold text-amber-400">
                        {Object.entries(comp.data.gaps)
                          .filter(([k]) => k !== 'overall')
                          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0][1]}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}