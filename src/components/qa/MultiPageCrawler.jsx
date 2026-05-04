import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Globe, Settings2 } from 'lucide-react';

export default function MultiPageCrawler({ url }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [maxPages, setMaxPages] = useState(5);
  const [maxDepth, setMaxDepth] = useState(2);

  const handleCrawlSite = async () => {
    setLoading(true);
    setPages([]);

    try {
      const res = await base44.functions.invoke('crawlMultiPage', {
        url,
        maxPages,
        maxDepth,
      });
      setPages(res.data?.pages || []);
    } catch (error) {
      console.error('Multi-page crawl error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Multi-Page Crawler
        </h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded hover:bg-secondary transition-colors"
        >
          <Settings2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Settings */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Max Pages</label>
                <Input
                  type="number"
                  value={maxPages}
                  onChange={(e) => setMaxPages(Math.max(1, parseInt(e.target.value)))}
                  className="h-8 text-sm"
                  min="1"
                  max="20"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Max Depth</label>
                <Input
                  type="number"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(Math.max(1, parseInt(e.target.value)))}
                  className="h-8 text-sm"
                  min="1"
                  max="5"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crawl Button */}
      <Button
        size="sm"
        className="w-full gap-2"
        onClick={handleCrawlSite}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
        {loading ? 'Crawling Site...' : 'Discover Pages'}
      </Button>

      {/* Results */}
      <AnimatePresence>
        {pages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground">Found {pages.length} page(s)</p>
            {pages.map((page, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1.5"
              >
                <p className="text-xs font-mono text-primary truncate">{page.url}</p>
                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                  <span>📄 {page.title?.slice(0, 20) || 'Untitled'}</span>
                  <span>🔗 {page.links}</span>
                  <span>🔘 {page.buttons}</span>
                  <span>⚠️ {page.errors}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}