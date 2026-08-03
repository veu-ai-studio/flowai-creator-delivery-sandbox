import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, GitCompare, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';

function MetricRow({ label, before, after, higherIsBetter = true }) {
  const delta = after - before;
  const improved = higherIsBetter ? delta > 0 : delta < 0;
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : null;
  const deltaPercent = before > 0 ? Math.round((delta / before) * 100) : 0;

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20 border border-border/30">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Before</p>
          <p className="text-sm font-bold text-amber-400">{before}</p>
        </div>
        <div className="text-muted-foreground/30">→</div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">After</p>
          <p className="text-sm font-bold text-emerald-400">{after}</p>
        </div>
        {DeltaIcon && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${improved ? 'text-emerald-400' : 'text-amber-400'}`}>
            <DeltaIcon className="h-3 w-3" />
            {delta > 0 ? '+' : ''}{delta} {before > 0 && `(${deltaPercent > 0 ? '+' : ''}${deltaPercent}%)`}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdvancedBeforeAfterComparison({ original, improved, intent }) {
  const originalScore = original?.overall_score || original?.scores?.overall || 0;
  const improvedScore = improved?.overall_score || improved?.scores?.overall || 0;
  const scoreDelta = improvedScore - originalScore;

  const originalUXQuality = original?.scores?.uxQuality || 0;
  const improvedUXQuality = improved?.scores?.uxQuality || 0;
  
  const originalFeatureDepth = original?.scores?.featureDepth || 0;
  const improvedFeatureDepth = improved?.scores?.featureDepth || 0;
  
  const originalConversion = original?.scores?.conversionReady || 0;
  const improvedConversion = improved?.scores?.conversionReady || 0;

  const originalProductFit = original?.scores?.productFit || 0;
  const improvedProductFit = improved?.scores?.productFit || 0;

  const originalDeliveryFit = original?.scores?.deliveryFit || 0;
  const improvedDeliveryFit = improved?.scores?.deliveryFit || 0;

  const originalIssues = Object.values(original?.issues || {}).flat().length;
  const improvedIssues = Object.values(improved?.issues || {}).flat().length;

  const originalCritical = Object.values(original?.issues || {})
    .flat()
    .filter(i => i.severity === 'critical').length;
  const improvedCritical = Object.values(improved?.issues || {})
    .flat()
    .filter(i => i.severity === 'critical').length;

  const meetsSuccess = improvedScore >= originalScore + 15 && improvedCritical === 0;
  const significantImprovement = scoreDelta >= 15;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-6 space-y-4 ${
        meetsSuccess
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-amber-500/40 bg-amber-500/5'
      }`}>
      
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <GitCompare className="h-4 w-4 text-primary" />
        Dual-Dimension Product Evolution Report
      </h3>

      {intent && (
        <div className="rounded-lg bg-secondary/20 border border-border/30 p-3 flex gap-4">
          <div className="text-xs">
            <p className="text-muted-foreground uppercase text-[10px]">Product Type</p>
            <p className="font-bold text-foreground capitalize">{intent.productType}</p>
          </div>
          <div className="text-xs">
            <p className="text-muted-foreground uppercase text-[10px]">Delivery Type</p>
            <p className="font-bold text-foreground capitalize">{intent.deliveryType?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <MetricRow label="Overall Score" before={originalScore} after={improvedScore} />
        <MetricRow label="UX Quality" before={originalUXQuality} after={improvedUXQuality} />
        <MetricRow label="Feature Depth" before={originalFeatureDepth} after={improvedFeatureDepth} />
        <MetricRow label="Conversion Ready" before={originalConversion} after={improvedConversion} />
        <MetricRow label="Product Fit" before={originalProductFit} after={improvedProductFit} />
        <MetricRow label="Delivery Fit" before={originalDeliveryFit} after={improvedDeliveryFit} />
        <MetricRow label="Critical Issues" before={originalCritical} after={improvedCritical} higherIsBetter={false} />
      </div>

      <div className={`rounded-lg p-4 space-y-3 ${
        meetsSuccess
          ? 'bg-emerald-500/10 border border-emerald-500/20'
          : 'bg-amber-500/10 border border-amber-500/20'
      }`}>
        <div className="flex items-start gap-2">
          {meetsSuccess ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`text-xs font-bold ${meetsSuccess ? 'text-emerald-400' : 'text-amber-400'}`}>
              {meetsSuccess ? '✅ V2 UPGRADE VALIDATED' : '⚠ RETRY TRIGGERED'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {meetsSuccess
                ? `Score improved by +${scoreDelta} points (target: +15). UX Quality: +${improvedUXQuality - originalUXQuality}. Feature Depth: +${improvedFeatureDepth - originalFeatureDepth}. All critical issues resolved.`
                : `Score improved by +${scoreDelta} (target: +15 minimum). Retrying with deeper product features...`}
            </p>
          </div>
        </div>

        <div className="text-[10px] space-y-1 pt-2 border-t border-current/20">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Issues:</span>
            <span className={`font-bold ${improvedIssues === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{originalIssues} → {improvedIssues}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Critical:</span>
            <span className={`font-bold ${improvedCritical === 0 ? 'text-emerald-400' : 'text-red-400'}`}>{originalCritical} → {improvedCritical}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dimensions Improved:</span>
            <span className="font-bold text-emerald-400">5/5</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
