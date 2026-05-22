import { motion } from 'framer-motion';
import { Database, FileCode, MapPin, CheckCircle2, Clock } from 'lucide-react';

const STATUS_CONFIG = {
  not_generated: { label: 'Not Generated', color: 'text-muted-foreground', dot: 'bg-muted-foreground/40' },
  generating:    { label: 'Generating…',   color: 'text-blue-400',         dot: 'bg-blue-400 animate-pulse' },
  ready:         { label: 'Ready',          color: 'text-emerald-400',      dot: 'bg-emerald-400' },
  needs_update:  { label: 'Needs Update',  color: 'text-amber-400',        dot: 'bg-amber-400' },
};

export default function DemoProductPreviewCards({ products, demos, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {products.map(product => {
        const demo = demos[product.name];
        const status = demo?.demo_status || 'not_generated';
        const sc = STATUS_CONFIG[status] || STATUS_CONFIG.not_generated;
        const tourStops = (() => {
          try { const t = JSON.parse(demo?.tour_script || '{}'); return t.steps?.length || 0; } catch { return 0; }
        })();

        return (
          <motion.button
            key={product.name}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(product.name)}
            className={`rounded-xl border p-4 text-left space-y-3 transition-all hover:shadow-lg hover:shadow-primary/5 ${product.border} ${product.bg}`}
          >
            <div className="flex items-center justify-between">
              <div className={`h-2.5 w-2.5 rounded-full ${sc.dot}`} />
              {demo?.microsite_deployed && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
            </div>
            <div>
              <p className={`text-xs font-bold ${product.color}`}>{product.name}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{product.tagline}</p>
            </div>
            <div className="space-y-1">
              <p className={`text-[9px] font-semibold ${sc.color}`}>{sc.label}</p>
              {status === 'ready' && (
                <div className="flex gap-2 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Database className="h-2.5 w-2.5" /> Data</span>
                  <span className="flex items-center gap-0.5"><FileCode className="h-2.5 w-2.5" /> Site</span>
                  {tourStops > 0 && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {tourStops}</span>}
                </div>
              )}
              {demo?.updated_at && status === 'ready' && (
                <p className="text-[8px] text-muted-foreground/60 flex items-center gap-0.5">
                  <Clock className="h-2 w-2" /> {new Date(demo.updated_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}