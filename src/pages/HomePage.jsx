import HeroDescriptionHero from '../components/HeroDescriptionHero.jsx';
import CardDescriptionActionPanel from '../components/CardDescriptionActionPanel.jsx';

export default function HomePage() {
  const links = [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">description-derived fresh build landing and workspace shell</p>
        <h1 className="text-4xl font-bold text-slate-950">FlowAI Creator Delivery Sandbox</h1>
        <p className="max-w-3xl text-base leading-7 text-slate-700">Product Name: FlowAI Isolated Release Evidence Pilot What it does: Builds a distinct public release-evidence dashboard from two authorized FlowAI reference surfaces. Target audience: Licensed pilot product operators. Key features: Research, Design, Build, Quality Audit, Deploy, Self-Renewal, GTM, and Monitor evidence; stable run identity; truthful gates; useful public preview. Current known issues: None assumed; fail closed and report blockers truthfully. Live URLs: https://flowai.flowaiplatform.com/landing and https://flowai.flowaiplatform.com/runs Constraints: Use both URLs only as public reference evidence. Deliver only to the configured isolated sandbox repo/project. Do not modify either source or promote the generated product to production. Require an absolute browser-clear HTTPS preview and a captured finite score meeting the configured target.Product Name: FlowAI Isolated Release Evidence Pilot What it does: Builds a distinct public release-evidence dashboard from two authorized FlowAI reference surfaces. Target audience: Licensed pilot product operators. Key features: Research, Design, Build, Quality Audit, Deploy, Self-Renewal, GTM, and Monitor evidence; stable run identity; truthful gates; useful public preview. Current known issues: None assumed; fail closed and report blockers truthfully. Live URLs: https://flowai.flowaiplatform.com/landing and https://flowai.flowaiplatform.com/runs Constraints: Use both URLs only as public reference evidence. Deliver only to the configured isolated sandbox repo/project. Do not modify either source or promote the generated product to production. Require an absolute browser-clear HTTPS preview and a captured finite score meeting the configured target.</p>
      </header>
      {links.length > 0 && (
        <nav className="mt-6 flex flex-wrap gap-3" aria-label="Page navigation">
          {links.map((link) => (
            <a key={link.target} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" href={link.target}>
              {link.label}
            </a>
          ))}
        </nav>
      )}
      <section className="mt-8 grid gap-4">
        <HeroDescriptionHero />
        <CardDescriptionActionPanel />
      </section>
    </main>
  );
}
