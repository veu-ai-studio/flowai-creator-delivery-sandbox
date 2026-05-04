import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { searchFeatures } from '@/lib/searchIndex';
import { Button } from '@/components/ui/button';
import { Search, ExternalLink, Loader2, ArrowRight } from 'lucide-react';

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.length > 0) {
      setResults(searchFeatures(query));
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSelect = (item) => {
    if (item.route) {
      navigate(item.route);
      onClose();
      setQuery('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-card border border-border rounded-lg shadow-xl z-50"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                placeholder="Search FlowAI pages, features, routes, reports…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-muted-foreground hover:text-foreground text-sm font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {query.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Type to search FlowAI features
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No results found for "{query}"
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {results.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 hover:bg-secondary/30 transition cursor-pointer"
                      onClick={() => handleSelect(item)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary">
                              {item.category}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                              {item.type}
                            </span>
                            {item.route && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground font-mono">
                                {item.route}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.route && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(item);
                            }}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
              <span>Press <kbd className="px-2 py-0.5 rounded bg-secondary text-foreground font-mono">Esc</kbd> to close</span>
              {results.length > 0 && (
                <span>{results.length} result{results.length !== 1 ? 's' : ''} found</span>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}