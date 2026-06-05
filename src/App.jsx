import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { OrchestrationProvider } from '@/lib/OrchestrationContext';
import { AgenticModeProvider } from '@/lib/AgenticModeContext';
import { JobProvider } from '@/lib/JobContext';
import { SessionProvider } from '@/lib/SessionContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ErrorBoundary from '@/components/ErrorBoundary';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import FlowDesigner from './pages/FlowDesigner';
import RunFlow from './pages/RunFlow';
import Flows from './pages/Flows';
import Analytics from './pages/Analytics';
import RunHistory from './pages/RunHistory';
import Templates from './pages/Templates';
import Variables from './pages/Variables';
import QAAudit from './pages/QAAudit';
import Research from './pages/Research';
import Design from './pages/Design';
import Build from './pages/Build';
import Pipeline from './pages/Pipeline';
import GTMPlatform from './pages/GTMPlatform';
import RealtimeDashboard from './pages/RealtimeDashboard';
import ProjectTemplates from './pages/ProjectTemplates';
import Billing from './pages/Billing';
import ActivityLog from './pages/ActivityLog';
import AIFeedbackLoop from './pages/AIFeedbackLoop';
import LandingPage from './pages/LandingPage';
import ModelMarketplace from './pages/ModelMarketplace';
import PlatformIntelligence from './pages/PlatformIntelligence';
import SelfUpgrade from './pages/SelfUpgrade';
import ExternalUpgrade from './pages/ExternalUpgrade';
import SelfVerification from './pages/SelfVerification';
import AutonomousEngine from './pages/AutonomousEngine';
import PortfolioEngine from './pages/PortfolioEngine';
import MasterOrchestrator from './pages/MasterOrchestrator';
import ProductGenerator from './pages/ProductGenerator';
import GTMEngine from './pages/GTMEngine';
import SelfProtection from './pages/SelfProtection';
import SelfHealing from './pages/SelfHealing';
import Governance from './pages/Governance';
import DomainManager from './pages/DomainManager';
import BrandSystem from './pages/BrandSystem';
import WhiteLabel from './pages/WhiteLabel';
import DataExport from './pages/DataExport';
import Architecture from './pages/Architecture';
import Environments from './pages/Environments';
import ProductionMonitor from './pages/ProductionMonitor';
import DemoGenerator from './pages/DemoGenerator';
import InvestorStudio from './pages/InvestorStudio';
import GTMAssets from './pages/GTMAssets';
import PlatformIntelligenceMarketplace from './pages/PlatformIntelligenceMarketplace';
import CompareTools from './pages/CompareTools';
import MyStack from './pages/MyStack';
import Clearance from './pages/Clearance';
import CreatorStudio from './pages/CreatorStudio';
import MyCreations from './pages/MyCreations';
import AutoRunner from './pages/AutoRunner';
import Renewal from './pages/Renewal';
import GuidedStep from './pages/GuidedStep';
import ManualStep from './pages/ManualStep';
import MainDashboard from './pages/MainDashboard';
import Configuration from './pages/Configuration';
import Onboarding from './pages/Onboarding';
import ReleaseNotes from './pages/ReleaseNotes';
import UsersStub from './pages/UsersStub';
import URLWhitelistStub from './pages/URLWhitelistStub';
import CostControlsStub from './pages/CostControlsStub';
import AuditTrail from './pages/AuditTrail';
import AppStoreDistribution from './pages/AppStoreDistribution';
import CapabilityTransfer from './pages/CapabilityTransfer';
import CapabilityPackageSelfRenewal from './pages/CapabilityPackageSelfRenewal';
import CapabilityPackageSelfProtection from './pages/CapabilityPackageSelfProtection';
import CapabilityInstallSelfRenewal from './pages/CapabilityInstallSelfRenewal';
import CapabilityInstallSelfProtection from './pages/CapabilityInstallSelfProtection';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';
import MarketingPage from './pages/MarketingPage';
import CostUsage from './pages/CostUsage';
import PortfolioDashboard from './pages/PortfolioDashboard';
import ProductRegistry from './pages/ProductRegistry';
import RunsHistory from './pages/RunsHistory';
import OrgSettings from './pages/OrgSettings';
import VEUaaSMarketing from './pages/VEUaaSMarketing';
import DemoSandbox from './pages/DemoSandbox';
import LiveDemo from './pages/LiveDemo';
import EnterpriseDemo from './pages/EnterpriseDemo';
import BaseAgentTest from './pages/BaseAgentTest';
import FlowAIDashboard from './pages/FlowAIDashboard';
import ForgeResearchForm from './pages/ForgeResearchForm';
import ForgeDesignForm from './pages/ForgeDesignForm';
import ForgeBuildForm from './pages/ForgeBuildForm';
import ForgeAuditForm from './pages/ForgeAuditForm';
import ForgeDeployForm from './pages/ForgeDeployForm';
import ForgeRenewalForm from './pages/ForgeRenewalForm';
import ForgeGTMForm from './pages/ForgeGTMForm';
import ForgeMonitorForm from './pages/ForgeMonitorForm';
import Workspace from './pages/Workspace';
import Login from './pages/Login';
import RequireAuth from '@/components/RequireAuth';

function LegacyFlowHubRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const destination = params.get('mode') === 'migration'
    ? '/flow-hub/migration'
    : '/flow-hub/production';
  return <Navigate to={destination} replace />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <ErrorBoundary>
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LegacyFlowHubRedirect />} />
        <Route path="/flow-hub" element={<Navigate to="/flow-hub/production" replace />} />
        <Route path="/flow-hub/production" element={<LandingPage />} />
        <Route path="/flow-hub/migration" element={<LandingPage />} />
        <Route path="/flowai" element={<FlowAIDashboard />} />
        <Route path="/forge/research" element={<ForgeResearchForm />} />
        <Route path="/forge/design" element={<ForgeDesignForm />} />
        <Route path="/forge/build" element={<ForgeBuildForm />} />
        <Route path="/forge/audit" element={<ForgeAuditForm />} />
        <Route path="/forge/quality-audit" element={<ForgeAuditForm />} />
        <Route path="/forge/deploy" element={<ForgeDeployForm />} />
        <Route path="/forge/self-renewal" element={<ForgeRenewalForm />} />
        <Route path="/forge/gtm" element={<ForgeGTMForm />} />
        <Route path="/forge/monitor" element={<ForgeMonitorForm />} />
        <Route path="/old-dashboard" element={<Dashboard />} />

        <Route path="/flow-designer" element={<FlowDesigner />} />
        <Route path="/run-flow" element={<RunFlow />} />
        <Route path="/flows" element={<Flows />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/run-history" element={<RunHistory />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/variables" element={<Variables />} />
        <Route path="/qa-audit" element={<QAAudit />} />
        <Route path="/research" element={<Research />} />
        <Route path="/design" element={<Design />} />
        <Route path="/build" element={<Build />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/gtm" element={<GTMPlatform />} />
        <Route path="/realtime" element={<RealtimeDashboard />} />
        <Route path="/templates-library" element={<ProjectTemplates />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/activity" element={<ActivityLog />} />
        <Route path="/ai-feedback" element={<AIFeedbackLoop />} />
        <Route path="/marketplace" element={<ModelMarketplace />} />
        <Route path="/intelligence" element={<PlatformIntelligence />} />
        <Route path="/self-upgrade" element={<SelfUpgrade />} />
        <Route path="/external-upgrade" element={<ExternalUpgrade />} />
        <Route path="/self-verification" element={<SelfVerification />} />
        <Route path="/autonomous-engine" element={<AutonomousEngine />} />
        <Route path="/portfolio-engine" element={<PortfolioEngine />} />
        <Route path="/master-orchestrator" element={<MasterOrchestrator />} />
        <Route path="/product-generator" element={<ProductGenerator />} />
        <Route path="/gtm-engine" element={<GTMEngine />} />
        <Route path="/self-protection" element={<SelfProtection />} />
        <Route path="/self-healing" element={<SelfHealing />} />
        {/* TRACK-E PR4 — magic-link auth required for governance and the
            autonomous runner. RequireAuth honors VITE_AUTH_BYPASS=1 so the
            CEO demo path stays open until full enforcement flips on. */}
        <Route path="/governance" element={<RequireAuth><Governance /></RequireAuth>} />
        <Route path="/domain-manager" element={<DomainManager />} />
        <Route path="/brand-system" element={<BrandSystem />} />
        <Route path="/white-label" element={<WhiteLabel />} />
        <Route path="/data-export" element={<DataExport />} />
        <Route path="/architecture" element={<Architecture />} />
        <Route path="/environments" element={<Environments />} />
        <Route path="/production-monitor" element={<ProductionMonitor />} />
        <Route path="/demo-generator" element={<DemoGenerator />} />
        <Route path="/investor-studio" element={<InvestorStudio />} />
        <Route path="/gtm-assets" element={<GTMAssets />} />
        <Route path="/marketplace/intelligence" element={<PlatformIntelligenceMarketplace />} />
        <Route path="/compare-tools" element={<CompareTools />} />
        <Route path="/my-stack" element={<MyStack />} />
        <Route path="/clearance" element={<Clearance />} />
        {/* NEW ROUTES — UX-C */}
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/configuration" element={<Configuration />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/my-products" element={<MyCreations />} />
        <Route path="/auto-runner" element={<RequireAuth><AutoRunner /></RequireAuth>} />
        <Route path="/renewal" element={<Renewal />} />
        <Route path="/guided/:step" element={<GuidedStep />} />
        <Route path="/manual/:step" element={<ManualStep />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/release-notes" element={<ReleaseNotes />} />
        <Route path="/users" element={<UsersStub />} />
        <Route path="/url-whitelist" element={<URLWhitelistStub />} />
        <Route path="/cost-controls" element={<CostControlsStub />} />
        <Route path="/audit-trail" element={<AuditTrail />} />
        <Route path="/app-store-distribution" element={<AppStoreDistribution />} />
        <Route path="/capability-transfer" element={<CapabilityTransfer />} />
        <Route path="/capability-packages/self-renewal" element={<CapabilityPackageSelfRenewal />} />
        <Route path="/capability-packages/self-protection" element={<CapabilityPackageSelfProtection />} />
        <Route path="/capability-packages/self-renewal/install" element={<CapabilityInstallSelfRenewal />} />
        <Route path="/capability-packages/self-protection/install" element={<CapabilityInstallSelfProtection />} />
        <Route path="/terms-of-use" element={<TermsOfUse />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/cost-usage" element={<CostUsage />} />
        <Route path="/portfolio" element={<PortfolioDashboard />} />
        <Route path="/products" element={<ProductRegistry />} />
        <Route path="/product-registry" element={<Navigate to="/products" replace />} />
        <Route path="/registry" element={<Navigate to="/products" replace />} />
        <Route path="/runs" element={<RunsHistory />} />
        <Route path="/session-history" element={<Navigate to="/runs" replace />} />
        <Route path="/sessions" element={<Navigate to="/runs" replace />} />
        <Route path="/settings" element={<OrgSettings />} />
        {/* Legacy redirects — Phase 5 cleanup */}
        <Route path="/flows" element={<Navigate to="/dashboard" replace />} />
        <Route path="/flow-designer" element={<Navigate to="/dashboard" replace />} />
        <Route path="/run-flow" element={<Navigate to="/dashboard" replace />} />
        <Route path="/run-history" element={<Navigate to="/dashboard" replace />} />
        <Route path="/variables" element={<Navigate to="/dashboard" replace />} />
        <Route path="/old-dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/autonomous-engine" element={<Navigate to="/auto-runner" replace />} />
        {/* Legacy aliases */}
        <Route path="/creator-studio" element={<Navigate to="/configuration" replace />} />
        <Route path="/my-creations" element={<MyCreations />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/landing" element={<MarketingPage />} />
      {/* GTM Demo Tiers — public, no AppLayout */}
      <Route path="/veuaas" element={<VEUaaSMarketing />} />
      <Route path="/demo" element={<DemoSandbox />} />
      <Route path="/live-demo" element={<LiveDemo />} />
      <Route path="/enterprise-demo" element={<EnterpriseDemo />} />
      <Route path="/base-agent-test" element={<BaseAgentTest />} />
      <Route path="/about" element={<Navigate to="/landing" replace />} />
      <Route path="*" element={<PageNotFound />} />

    </Routes>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <AuthProvider>
      <OrchestrationProvider>
      <AgenticModeProvider>
      <JobProvider>
      <SessionProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </SessionProvider>
      </JobProvider>
      </AgenticModeProvider>
      </OrchestrationProvider>
    </AuthProvider>
  )
}

export default App
