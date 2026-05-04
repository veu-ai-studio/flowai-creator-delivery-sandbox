import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Globe, ArrowRight, CheckCircle2, AlertCircle, Sparkles, Zap } from 'lucide-react';
import UpgradeInput from '@/components/upgrade/UpgradeInput';
import OriginalProductPanel from '@/components/upgrade/OriginalProductPanel';
import ImprovedVersionPanel from '@/components/upgrade/ImprovedVersionPanel';
import AdvancedBeforeAfterComparison from '@/components/upgrade/AdvancedBeforeAfterComparison';

export default function ExternalUpgrade() {
  const [targetUrl, setTargetUrl] = useState('');
  const [userGoal, setUserGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);

  // Original product state
  const [originalAudit, setOriginalAudit] = useState(null);
  const [originalMetadata, setOriginalMetadata] = useState(null);
  const [intent, setIntent] = useState(null);
  const [improvementPlan, setImprovementPlan] = useState(null);

  // Improved version state
  const [improvedUrl, setImprovedUrl] = useState(null);
  const [improvedAudit, setImprovedAudit] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [generatedFiles, setGeneratedFiles] = useState(null);

  // Validation state
  const [validation, setValidation] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(2);

  // Completion state
  const [completed, setCompleted] = useState(false);

  const countCritical = (issues) => {
    if (!issues || typeof issues !== 'object') return 0;
    return Object.values(issues)
      .flatMap(v => Array.isArray(v) ? v : [])
      .filter(i => i?.severity === 'critical').length;
  };

  const validateImprovement = (originalAudit, improvedAudit) => {
    const scoreImproved = improvedAudit.overall_score >= originalAudit.overall_score;
    const originalCritical = countCritical(originalAudit.issues);
    const improvedCritical = countCritical(improvedAudit.issues);
    const criticalFixed = improvedCritical === 0 && originalCritical > 0;
    const significantImprovement = (improvedAudit.overall_score - originalAudit.overall_score) >= 5;

    return {
      scoreImproved,
      criticalFixed,
      significantImprovement,
      isValid: scoreImproved && (criticalFixed || significantImprovement),
    };
  };

  const runUpgradeLoop = async () => {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setError(null);
    setCompleted(false);
    setRetryCount(0);
    setOriginalAudit(null);
    setImprovedUrl(null);
    setImprovedAudit(null);
    setIntent(null);
    setImprovementPlan(null);

    try {
      // Step 0: Detect Intent
      setCurrentStep('Detecting product intent...');
      const intentRes = await base44.functions.invoke('detectIntent', { url: targetUrl });
      setIntent(intentRes?.data);

      // Step 1: Audit Original
      setCurrentStep('Auditing original product...');
      const auditRes = await base44.functions.invoke('auditDeployment', {
        url: targetUrl,
      });
      const originalScores = auditRes?.data?.scores || {};
      const originalIssues = auditRes?.data?.issues || {};
      setOriginalAudit({
        url: targetUrl,
        scores: originalScores,
        issues: originalIssues,
        summary: auditRes?.data?.summary,
        overall_score: originalScores.overall || 0,
        checks: auditRes?.data?.checks,
      });
      setOriginalMetadata({
        title: auditRes?.data?.crawl_data?.title || 'External Product',
        description: auditRes?.data?.crawl_data?.description || '',
      });

      // Step 2: Build Improvement Plan
      setCurrentStep('Building improvement plan...');
      const planRes = await base44.functions.invoke('buildImprovementPlan', {
        audit: auditRes?.data,
        intent: intentRes?.data,
      });
      setImprovementPlan(planRes?.data);

      // Step 3: Generate Improved Version (Intent-Aware)
      setCurrentStep('Generating improved version...');
      console.log('External Upgrade response — originalIssues:', originalIssues);
      console.log('External Upgrade response — planRes:', planRes?.data);

      const safeIssues = typeof originalIssues === 'object' && originalIssues !== null
        ? Object.entries(originalIssues).flatMap(([layer, items]) =>
            Array.isArray(items) ? items.map(i => `${layer}: ${i.description || i}`) : []
          )
        : [];

      const safePlan = Array.isArray(planRes?.data?.plan) ? planRes.data.plan : [];

      const buildContext = `Product Type: ${intentRes?.data?.productType}
Target User: ${intentRes?.data?.targetUser}
Value Proposition: ${intentRes?.data?.valueProposition}

Original URL: ${targetUrl}
Original Score: ${originalScores.overall || 0}/100
Key Issues: ${safeIssues.slice(0, 10).join(', ') || 'None detected'}

Improvement Plan:
${safePlan.map(p => `- ${p.action}: ${Array.isArray(p.details) ? p.details.join(', ') : p.details || ''}`).join('\n') || 'Improve overall quality'}

User Goal: ${userGoal || 'Improve overall quality and user experience'}

Generate a production-ready improved version that addresses these issues and matches the product type.`;

      const codeRes = await base44.functions.invoke('generateCode', {
        app_name: originalMetadata?.title || 'Improved Product',
        context: buildContext,
        tech_stack: ['HTML', 'Tailwind CSS', 'Node.js', 'Express'],
        ui_components: ['Hero', 'Features', 'Call-to-Action'],
        api_endpoints: ['GET /api', 'POST /api/run'],
        intent: intentRes?.data,
        plan: planRes?.data?.plan,
      });

      const generatedFiles = codeRes?.data?.files || [];
      setGeneratedFiles(generatedFiles);

      // Step 4: Deploy
      setCurrentStep('Deploying improved version...');
      const deployRes = await base44.functions.invoke('deployApp', {
        app_name: (originalMetadata?.title || 'Improved') + ' (Upgraded)',
        context: buildContext,
        files: generatedFiles,
      });

      let currentUrl = deployRes?.data?.url;
      if (!currentUrl) throw new Error('Deployment failed — no URL returned');
      setImprovedUrl(currentUrl);

      // Step 5: Verify
      setCurrentStep('Verifying deployment...');
      let verifyRes = await base44.functions.invoke('verifyDeployment', {
        url: currentUrl,
      });
      setVerifyResult(verifyRes?.data || {});

      if (!verifyRes?.data?.passed) {
        throw new Error('Verification failed — deployment did not pass all checks');
      }

      // Step 6: Audit Improved Version
      setCurrentStep('Auditing improved version...');
      let auditRes2 = await base44.functions.invoke('auditDeployment', {
        url: currentUrl,
      });

      let improvedScores = auditRes2?.data?.scores || {};
      let improvedIssues = auditRes2?.data?.issues || {};
      const improvedScore = improvedScores.overall || 0;
      const originalScore = originalScores.overall || 0;
      const originalCritical = countCritical(originalIssues);
      const improvedCritical = countCritical(improvedIssues);

      // Validate improvement using v2.1 enforcement
      setCurrentStep('Validating upgrade against v2.1 requirements...');
      let validationResult = null;
      try {
        const validateRes = await base44.functions.invoke('validateUpgrade', {
          original_audit: originalAudit,
          improved_audit: { ...auditRes2?.data, overall_score: improvedScore, issues: improvedIssues },
        });
        validationResult = validateRes?.data;
        setValidation(validationResult);
      } catch (e) {
        validationResult = { passed: false, mandatory_failures: ['validation_error'] };
        setValidation(validationResult);
      }

      // If validation failed AND retries remain, auto-retry with v2.1 feedback
      if (!validationResult?.passed && retryCount < maxRetries) {
        const failures = validationResult?.mandatory_failures?.join(', ') || 'Feature Depth/Delivery Fit';
        setCurrentStep(`v2.1 validation failed (${failures}) — retrying with functional workflow enforcement...`);
        setRetryCount(retryCount + 1);

        // Clear and retry
        await new Promise(r => setTimeout(r, 2000));
        // Recursively retry with enhanced context
        return runUpgradeLoop();
      }

      // Set final improved audit result
      setImprovedAudit({
        url: currentUrl,
        scores: improvedScores,
        issues: improvedIssues,
        summary: auditRes2?.data?.summary,
        overall_score: improvedScore,
        checks: auditRes2?.data?.checks,
      });

      setCompleted(true);
      setCurrentStep('');
    } catch (err) {
      setError(err?.message || 'Upgrade loop failed');
      setCurrentStep('');
    } finally {
      setLoading(false);
    }
  };

  const handleNewUpgrade = () => {
    setTargetUrl('');
    setUserGoal('');
    setOriginalAudit(null);
    setImprovedUrl(null);
    setImprovedAudit(null);
    setIntent(null);
    setImprovementPlan(null);
    setValidation(null);
    setRetryCount(0);
    setCompleted(false);
    setError(null);
  };

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 mb-1">
          <Sparkles className="h-7 w-7 text-primary" />
          External Product Upgrade
        </h1>
        <p className="text-sm text-muted-foreground">
          Audit any product URL and auto-generate an improved version using FlowAI engines
        </p>
      </motion.div>

      {/* Input Section */}
      {!completed && (
        <UpgradeInput
          targetUrl={targetUrl}
          userGoal={userGoal}
          onUrlChange={setTargetUrl}
          onGoalChange={setUserGoal}
          onSubmit={runUpgradeLoop}
          loading={loading}
          currentStep={currentStep}
          error={error}
        />
      )}

      {/* Results */}
      <AnimatePresence>
        {originalAudit && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Original Product */}
            <OriginalProductPanel audit={originalAudit} metadata={originalMetadata} />

            {/* Improved Version */}
            {improvedUrl && improvedAudit && (
              <>
                <ImprovedVersionPanel
                  audit={improvedAudit}
                  url={improvedUrl}
                  verifyResult={verifyResult}
                  generatedFiles={generatedFiles}
                />

                {/* Intent & Plan Summary */}
                {intent && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Intent Analysis & Improvement Plan
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Product Type</p>
                        <p className="text-xs font-bold text-foreground capitalize">{intent.productType}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Target User</p>
                        <p className="text-xs font-bold text-foreground">{intent.targetUser?.slice(0, 40)}...</p>
                      </div>
                    </div>
                    {improvementPlan?.plan && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Improvements Applied</p>
                        <div className="space-y-1">
                          {improvementPlan.plan.slice(0, 3).map((step, i) => (
                            <p key={i} className="text-[10px] text-emerald-400">✓ {step.action}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Before vs After with Validation */}
                <AdvancedBeforeAfterComparison
                  original={originalAudit}
                  improved={improvedAudit}
                  intent={intent}
                />

                {/* Validation Status */}
                {validation && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-4 space-y-2 ${
                      validation.passed
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-amber-500/40 bg-amber-500/5'
                    }`}>
                    <div className="flex items-start gap-2">
                      {validation.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div className="text-xs flex-1">
                        <p className={`font-bold ${validation.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {validation.passed ? 'v2.1 VALIDATED ✓' : `v2.1 CHECK FAILED — RETRY ${retryCount}/${maxRetries}`}
                        </p>
                        <div className="text-muted-foreground mt-1 space-y-1">
                          <p>✓ Feature Depth: {validation.checks?.feature_depth_maintained ? 'maintained' : 'REGRESSION'}</p>
                          <p>✓ Delivery Fit: {validation.checks?.delivery_fit_maintained ? 'maintained' : 'REGRESSION'}</p>
                          <p>✓ Workflows: {validation.details?.functional_features_detected?.total_functional_features || 0} functional feature{(validation.details?.functional_features_detected?.total_functional_features || 0) !== 1 ? 's' : ''}</p>
                          <p>✓ Critical Issues: {validation.details?.improved_critical_issues || 0}</p>
                          {validation.mandatory_failures?.length > 0 && (
                            <p className="text-amber-400 mt-1">Issues: {validation.mandatory_failures.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {/* Loading States */}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-xl border border-primary/30 bg-primary/5 p-6 flex items-center gap-4">
                <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{currentStep}</p>
                  <p className="text-xs text-muted-foreground mt-1">FlowAI is processing your request...</p>
                </div>
              </motion.div>
            )}

            {/* Completion Actions */}
            {completed && improvedUrl && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-bold text-sm text-emerald-400">Upgrade Complete ✓</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button className="gap-2" onClick={() => window.open(improvedUrl, '_blank')}>
                    <Globe className="h-4 w-4" />
                    View Live Improved Version
                  </Button>
                  <Button variant="outline" onClick={handleNewUpgrade}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Run Another Upgrade
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && !originalAudit && !error && (
        <div className="text-center py-16">
          <Globe className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Enter a product URL to get started</p>
        </div>
      )}
    </div>
  );
}