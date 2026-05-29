import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgenticMode, AGENTIC_MODES } from '@/lib/OrchestrationContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Play, RefreshCw, Loader2, AlertTriangle, CheckCircle2,
  BarChart3, Zap, Target, TrendingUp, Copy, Check, Eye, ToggleLeft, ToggleRight,
} from 'lucide-react';
import AutonomousFixesPanel from '@/components/qa/AutonomousFixesPanel';
import CompetitiveBenchmark from '@/components/qa/CompetitiveBenchmark';
import MultiPageCrawler from '@/components/qa/MultiPageCrawler';
import PDFReportGenerator from '@/components/qa/PDFReportGenerator';
import HistoricalTrendDashboard from '@/components/qa/HistoricalTrendDashboard';
import CustomRuleConfig from '@/components/qa/CustomRuleConfig';
import EmailAlertConfig from '@/components/qa/EmailAlertConfig';
import SiteMonitoringDashboard from '@/components/qa/SiteMonitoringDashboard';
import TeamCollaborationPanel from '@/components/qa/TeamCollaborationPanel';
import IssuePrioritization from '@/components/qa/IssuePrioritization';
import CompetitiveAnalysis from '@/components/qa/CompetitiveAnalysis';
import AutomationDashboard from '@/components/qa/AutomationDashboard';
import RunHistoryPanel from '@/components/qa/RunHistoryPanel';
import ImprovementSummary from '@/components/qa/ImprovementSummary';
import InteractiveAuditDashboard from '@/components/qa/InteractiveAuditDashboard';
import TrendAnalysisReports from '@/components/qa/TrendAnalysisReports';
import AutoFixSuggestionModal from '@/components/qa/AutoFixSuggestionModal';
import PredictiveIssueMapping from '@/components/qa/PredictiveIssueMapping';
import CrossRunComparison from '@/components/qa/CrossRunComparison';
import SmartActionRecommendations from '@/components/qa/SmartActionRecommendations';
import SlackIntegration from '@/components/qa/SlackIntegration';
import CICDHookPanel from '@/components/qa/CICDHookPanel';
import RoleBasedAccess from '@/components/qa/RoleBasedAccess';
import IterationComparisonEngine from '@/components/qa/IterationComparisonEngine';
import VisualRegressionPanel from '@/components/qa/VisualRegressionPanel';
import CrossEnvironmentDashboard from '@/components/qa/CrossEnvironmentDashboard';
import WebhookNotificationCenter from '@/components/qa/WebhookNotificationCenter';
import AutomatedFixGenerator from '@/components/qa/AutomatedFixGenerator';
import PriorityHeatmap from '@/components/qa/PriorityHeatmap';
import ComplianceAuditMode from '@/components/qa/ComplianceAuditMode';
import OptimizationEngine from '@/components/qa/OptimizationEngine';
import IntelligentReporting from '@/components/qa/IntelligentReporting';
import CollaborativeAnnotation from '@/components/qa/CollaborativeAnnotation';
import APITestingSuite from '@/components/qa/APITestingSuite';
import FixRequestButton from '@/components/qa/FixRequestButton';
import PerformanceExportTool from '@/components/shared/PerformanceExportTool';
import TeamFeedbackModule from '@/components/shared/TeamFeedbackModule';
import StatusAlertSystem from '@/components/shared/StatusAlertSystem';
import BulkUploadTool from '@/components/shared/BulkUploadTool';
import AutomatedScheduler from '@/components/shared/AutomatedScheduler';
import ActivityHistoryLog from '@/components/shared/ActivityHistoryLog';

const LAYER_COLORS = {
  ui_ux: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  api: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  logic: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  business_value: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
};

const PRIORITY_COLORS = {
  critical: 'bg-red-500/10 border-red-500/30 text-red-400',
  high: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  medium: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  low: 'bg-gray-500/10 border-gray-500/30 text-gray-400',
};

function ScoreCard({ label, score, details, issues }) {
  const colors = LAYER_COLORS[label] || LAYER_COLORS.ui_ux;
  const safeDetails = details && typeof details === 'object' ? details : {};
  const safeIssues = Array.isArray(issues) ? issues : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 ${colors.bg} ${colors.border} border`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${colors.text} uppercase tracking-wide`}>
          {label.replace(/_/g, ' ')}
        </h3>
        <div className={`text-2xl font-bold ${score >= 7 ? 'text-emerald-400' : score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
          {score}/10
        </div>
      </div>

      <div className="space-y-2 text-xs">
        {Object.entries(safeDetails).map(([key, val]) => (
          <div key={key} className="flex justify-between text-muted-foreground">
            <span>{key.replace(/_/g, ' ')}:</span>
            <span className="text-foreground">{String(val)}</span>
          </div>
        ))}
      </div>

      {safeIssues.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
          {safeIssues.map((issue, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0 mt-0.5" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function QAAudit() {
  const { mode, flowType, iterationMode } = useAgenticMode();
  const [url, setUrl] = useState('https://example.com');
  const [isSpa, setIsSpa] = useState(false);
  const [appContext, setAppContext] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [crawlData, setCrawlData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showCrawlPreview, setShowCrawlPreview] = useState(false);
  const [runHistory, setRunHistory] = useState([]);
  const [autoIterationCount, setAutoIterationCount] = useState(0);
  const [showAutoFixModal, setShowAutoFixModal] = useState(false);
  const [previousResult, setPreviousResult] = useState(null);
  const [iterationCount, setIterationCount] = useState(0);
  const MAX_AUTONOMOUS_ITERATIONS = 3;
  const IMPROVEMENT_THRESHOLD = 0.5;



  const handleRun = async () => {
    setRunning(true);
    setResults(null);
    setCrawlData(null);
    
    try {
      // STEP 1: CRAWL via Claude
      const crawlRes = await base44.functions.invoke('claudeCrawl', { url });
      
      if (!crawlRes?.data) {
        throw new Error('Crawl returned no data: ' + JSON.stringify(crawlRes));
      }

      setCrawlData(crawlRes.data);

      // Supervised mode: stop and show preview
      if (mode === AGENTIC_MODES.supervised) {
        setRunning(false);
        setShowCrawlPreview(true);
        return;
      }

      // STEP 2: ANALYZE
      const analysisRes = await base44.functions.invoke('analyzeQA', {
        crawlData: crawlRes.data,
        isSpa,
        appContext: isSpa ? appContext : '',
      });

      if (!analysisRes?.data) {
        throw new Error('Analysis returned no data: ' + JSON.stringify(analysisRes));
      }

      // Normalize recommendations
      const recs = Array.isArray(analysisRes.data?.recommendations)
        ? analysisRes.data.recommendations.map(r => {
            if (typeof r === 'string') return { action: r, priority: 'medium', layer: 'general', details: [] };
            return {
              action: typeof r.action === 'string' ? r.action : (typeof r.title === 'string' ? r.title : JSON.stringify(r.action ?? r)),
              priority: typeof r.priority === 'string' ? r.priority : 'medium',
              layer: typeof r.layer === 'string' ? r.layer : 'general',
              details: Array.isArray(r.details) ? r.details.map(d => typeof d === 'string' ? d : JSON.stringify(d)) : [],
            };
          })
        : [];

      const finalResults = {
        ...analysisRes.data,
        recommendations: recs,
        error: null,
        timestamp: new Date().toISOString(),
      };
      
      setPreviousResult(prev => results || prev);
      setResults(finalResults);
      setRunHistory(prev => [...prev, finalResults]);
      setIterationCount(prev => prev + 1);

      // Handle iteration modes — use global iterationMode
      if (iterationMode === 'auto' && autoIterationCount < MAX_AUTONOMOUS_ITERATIONS - 1) {
        const prevScore = results?.scores?.overall ?? 0;
        const currScore = finalResults.scores?.overall ?? 0;
        const delta = currScore - prevScore;
        if (Math.abs(delta) >= IMPROVEMENT_THRESHOLD) {
          setAutoIterationCount(prev => prev + 1);
          setTimeout(() => handleRun(), 2000);
        }
      }
      
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.message || String(error);
      setResults({
        error: errorMsg,
        error_details: error?.stack,
      });
      
    } finally {
      setRunning(false);
    }
  };

  const handleProceedFromPreview = async () => {
    setShowCrawlPreview(false);
    setRunning(true);
    
    try {
      const analysisRes = await base44.functions.invoke('analyzeQA', {
        crawlData,
        isSpa,
        appContext: isSpa ? appContext : '',
      });
      
      // Normalize recommendations
      const recs = Array.isArray(analysisRes.data?.recommendations)
        ? analysisRes.data.recommendations.map(r => {
            if (typeof r === 'string') return { action: r, priority: 'medium', layer: 'general', details: [] };
            return {
              action: typeof r.action === 'string' ? r.action : (typeof r.title === 'string' ? r.title : JSON.stringify(r.action ?? r)),
              priority: typeof r.priority === 'string' ? r.priority : 'medium',
              layer: typeof r.layer === 'string' ? r.layer : 'general',
              details: Array.isArray(r.details) ? r.details.map(d => typeof d === 'string' ? d : JSON.stringify(d)) : [],
            };
          })
        : [];

      setResults({
        ...analysisRes.data,
        recommendations: recs,
      });
    } catch (error) {
      console.error('Analysis error:', error.message || error);
    } finally {
      setRunning(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-8">
      {/* Header with Mode Selector */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              QA / Audit Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Multi-layer system analysis: UI/UX, API, Logic, Business Value
            </p>
          </div>
        </div>

        {/* Mode info — driven by global Orchestration Bar */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-[10px] px-2 py-1 rounded-full border border-border bg-secondary/30 text-muted-foreground">
            Mode: <span className="text-foreground font-semibold capitalize">{mode.replace('_', ' ')}</span>
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full border border-border bg-secondary/30 text-muted-foreground">
            Iteration: <span className="text-foreground font-semibold capitalize">{iterationMode}</span>
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full border border-border bg-secondary/30 text-muted-foreground">
            Flow: <span className="text-foreground font-semibold capitalize">{flowType.replace('_', ' ')}</span>
          </span>
          <span className="text-[10px] text-muted-foreground/60 self-center">← change via top bar</span>
        </div>
      </motion.div>

      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card p-6 space-y-4"
      >
        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">Target URL / App</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://app.example.com"
            className="h-9 text-sm bg-background"
            disabled={running}
          />
          <p className="text-xs text-muted-foreground mt-2">
            HTTPS URL required. Claude AI analyzes page structure, UI/UX, API stability, logic integrity, and business value.
          </p>
        </div>

        {/* SPA Toggle */}
        <div className="space-y-3">
          <button
            onClick={() => setIsSpa(v => !v)}
            className="flex items-center gap-2 group"
            disabled={running}
          >
            {isSpa
              ? <ToggleRight className="h-5 w-5 text-primary" />
              : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
            <span className={`text-sm font-medium ${isSpa ? 'text-foreground' : 'text-muted-foreground'}`}>
              Base44 / React SPA
            </span>
            <span className="text-xs text-muted-foreground">(client-side rendered — skips raw crawl penalties)</span>
          </button>

          {isSpa && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">App Context (optional)</Label>
              <Textarea
                value={appContext}
                onChange={e => setAppContext(e.target.value)}
                placeholder="Briefly describe this app: its purpose, main pages, known issues, and target users. This context supplements the crawl."
                className="min-h-20 text-sm resize-none"
                disabled={running}
              />
            </motion.div>
          )}
        </div>

        <div className="flex gap-3">
          <Button size="lg" className="gap-2" onClick={handleRun} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? 'Auditing...' : 'Run Audit'}
          </Button>
          {results && (
            <Button variant="outline" size="lg" className="gap-2" onClick={handleRun}>
              <RefreshCw className="h-4 w-4" />
              Re-audit
            </Button>
          )}

        </div>
      </motion.div>

      {/* ERROR DISPLAY */}
      {results?.error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-2"
        >
          <p className="text-sm font-semibold text-destructive">🔴 Pipeline Error</p>
          <p className="text-xs text-destructive/80">{results.error}</p>
          {results.error_details && (
            <pre className="text-[10px] bg-background rounded p-2 overflow-x-auto text-muted-foreground max-h-24 overflow-y-auto">
              {results.error_details}
            </pre>
          )}
        </motion.div>
      )}

      {/* Results Section */}
      <AnimatePresence>
        {results && !results.error && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Overall Score */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                {results.scores.overall >= 7 ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-400" />
                )}
                <h2 className="text-2xl font-bold text-foreground">Overall Score</h2>
              </div>
              <div className="text-6xl font-bold text-primary mb-2">{results.scores.overall}/10</div>
              <p className="text-muted-foreground">
                {results.scores.overall >= 8
                  ? 'Excellent system health'
                  : results.scores.overall >= 6
                  ? 'Good, with room for improvement'
                  : 'Needs attention in multiple areas'}
              </p>
            </motion.div>

            {/* Layer Scores */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Multi-Layer Analysis
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(results.scores)
                  .filter(([key]) => key !== 'overall')
                  .map(([layer, score]) => (
                    <ScoreCard
                      key={layer}
                      label={layer}
                      score={score}
                      details={results.details?.[layer] || {}}
                      issues={results.issues?.[layer] || []}
                    />
                  ))}
              </div>
            </div>

            {/* Improvement Summary */}
            {runHistory.length > 1 && (
              <ImprovementSummary
                currentRun={results}
                previousRun={runHistory[runHistory.length - 2]}
              />
            )}

            {/* Optimization Engine — Phase 1 */}
            <OptimizationEngine
              results={results}
              previousResult={previousResult}
              runHistory={runHistory}
              iterationMode={iterationMode}
              iterationCount={iterationCount}
              onRerun={handleRun}
              running={running}
            />

            {/* Iteration Comparison Engine */}
            {previousResult && (
              <IterationComparisonEngine
                currentResult={results}
                previousResult={previousResult}
                iterationMode={iterationMode}
                iterationCount={iterationCount}
                maxIterations={MAX_AUTONOMOUS_ITERATIONS}
                onRerun={handleRun}
                running={running}
              />
            )}

            {/* Run History */}
            <RunHistoryPanel runHistory={runHistory} />

            {/* Recommendations */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Recommendations ({results.recommendations.length})
              </h2>
              <div className="space-y-2">
                {results.recommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No issues detected ✓</p>
                ) : (
                  results.recommendations.map((rec, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-lg border p-4 ${PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.medium}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold capitalize">{rec.action}</p>
                          <span className="text-[10px] uppercase tracking-wide opacity-70 mt-1 block">
                            {(rec.layer || 'general').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.medium}`}>
                          {rec.priority || 'medium'}
                        </span>
                      </div>
                      {Array.isArray(rec.details) && rec.details.length > 0 && (
                        <ul className="text-xs space-y-1 mt-2 opacity-80">
                          {rec.details.map((detail, j) => (
                            <li key={j}>• {detail}</li>
                          ))}
                        </ul>
                      )}
                      <FixRequestButton recommendation={rec} crawlData={crawlData} />
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Performance Export */}
            <PerformanceExportTool results={results} url={url} runHistory={runHistory} />

            {/* Status Alerts */}
            <StatusAlertSystem currentScore={results?.scores?.overall} hasNewResults={!!results && !results.error} />

            {/* Export & Quick Actions */}
            <div className="flex gap-3 pt-4 flex-wrap">
              <Button variant="outline" size="sm" className="gap-2" onClick={copyToClipboard}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Export JSON'}
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setShowAutoFixModal(true)}>
                <Zap className="h-3.5 w-3.5" />
                AI-Powered Fixes
              </Button>
            </div>

            {/* Interactive Dashboard */}
            <InteractiveAuditDashboard results={results} url={url} />

            {/* Smart Recommendations & Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SmartActionRecommendations results={results} url={url} />
              <PredictiveIssueMapping url={url} currentResults={results} />
            </div>

            {/* Comparative Analysis */}
            <TrendAnalysisReports url={url} currentResults={results} />
            <CrossRunComparison runHistory={runHistory} />

            {/* Advanced Features */}
            <div className="space-y-6 mt-8 border-t border-border pt-8">
              {/* Automation Control Center */}
              <AutomationDashboard url={url} analysisResults={results} />

              {/* Core Reporting */}
              <PDFReportGenerator results={results} crawlData={crawlData} url={url} />
              
              {/* Monitoring & Alerts */}
              <SiteMonitoringDashboard url={url} />
              <EmailAlertConfig url={url} />
              
              {/* Team & Collaboration */}
              <TeamCollaborationPanel reportId={results?.id} workspaceId={null} url={url} />
              
              {/* Smart Analysis */}
              <IssuePrioritization analysis={results} url={url} />
              <CompetitiveAnalysis yourResults={results} yourUrl={url} />
              
              {/* Slack & CI/CD */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SlackIntegration results={results} url={url} />
                <CICDHookPanel url={url} results={results} />
              </div>

              {/* Role-Based Access */}
              <RoleBasedAccess />

              {/* Automated Fix Generator */}
              <AutomatedFixGenerator results={results} crawlData={crawlData} />

              {/* Priority Heatmap */}
              <PriorityHeatmap results={results} />

              {/* Compliance Audit Mode */}
              <ComplianceAuditMode results={results} crawlData={crawlData} url={url} />

              {/* Visual Regressions */}
              <VisualRegressionPanel url={url} crawlData={crawlData} />

              {/* Cross-Environment Dashboard */}
              <CrossEnvironmentDashboard />

              {/* Webhook Notification Center */}
              <WebhookNotificationCenter results={results} url={url} />

              {/* Historical & Configuration */}
              <HistoricalTrendDashboard url={url} />
              <CustomRuleConfig />
              <AutonomousFixesPanel analysis={results} crawlData={crawlData} />
              <CompetitiveBenchmark currentResults={results} />
              <MultiPageCrawler url={url} />

              {/* New Features */}
              <IntelligentReporting results={results} url={url} />
              <CollaborativeAnnotation results={results} url={url} />
              <APITestingSuite url={url} />
              <TeamFeedbackModule context="qa-audit" />

              {/* Bulk Upload, Scheduling & Activity */}
              <BulkUploadTool onImported={(data) => console.log('Imported', data.length, 'records')} />
              <AutomatedScheduler onScheduledRun={(url) => { setUrl(url); handleRun(); }} />
              <ActivityHistoryLog />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crawl Preview Modal (Supervised Mode) */}
      <AnimatePresence>
        {showCrawlPreview && crawlData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-card border border-border rounded-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto p-6 space-y-4"
            >
              <h2 className="text-xl font-semibold text-foreground">Crawl Preview</h2>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Title:</span>
                  <p className="font-mono text-foreground">{crawlData.title}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">URL:</span>
                  <p className="font-mono text-foreground text-xs truncate">{crawlData.url}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Links:</span>
                  <p className="text-foreground font-semibold">{crawlData.links?.length || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Buttons:</span>
                  <p className="text-foreground font-semibold">{crawlData.buttons?.length || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Forms:</span>
                  <p className="text-foreground font-semibold">{crawlData.forms}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Console Errors:</span>
                  <p className="text-foreground font-semibold">{crawlData.errors?.length || 0}</p>
                </div>
              </div>

              {crawlData.screenshotBase64 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Screenshot:</span>
                  <img
                    src={`data:image/png;base64,${crawlData.screenshotBase64}`}
                    alt="Page screenshot"
                    className="w-full rounded-lg border border-border max-h-64 object-contain"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowCrawlPreview(false)}>
                  Cancel
                </Button>
                <Button onClick={handleProceedFromPreview} disabled={running}>
                  {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Proceed to Analysis
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evidence Display */}
      {results && crawlData && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg border border-border bg-card p-6 space-y-4 mt-8"
        >
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Evidence & Data
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="rounded-lg bg-secondary/50 p-3">
              <span className="text-muted-foreground text-xs">Links</span>
              <p className="text-2xl font-bold text-foreground">{crawlData.links?.length || 0}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <span className="text-muted-foreground text-xs">Buttons</span>
              <p className="text-2xl font-bold text-foreground">{crawlData.buttons?.length || 0}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <span className="text-muted-foreground text-xs">Forms</span>
              <p className="text-2xl font-bold text-foreground">{crawlData.forms}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <span className="text-muted-foreground text-xs">Errors</span>
              <p className="text-2xl font-bold text-red-400">{crawlData.errors?.length || 0}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!running && !results && !showCrawlPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Click "Run Audit" to analyze the system</p>
        </motion.div>
      )}

      {/* Auto-Fix Modal */}
      <AutoFixSuggestionModal
        analysis={results}
        crawlData={crawlData}
        isOpen={showAutoFixModal}
        onClose={() => setShowAutoFixModal(false)}
      />
    </div>
  );
}