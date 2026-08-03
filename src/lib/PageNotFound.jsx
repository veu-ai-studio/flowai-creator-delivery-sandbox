import { useLocation, useNavigate } from 'react-router-dom';

export default function PageNotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-xl" aria-labelledby="not-found-title">
        <p className="text-7xl font-light text-muted-foreground/40" aria-hidden="true">404</p>
        <h1 id="not-found-title" className="mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The route <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">{location.pathname}</code> is not available.
        </p>
        <button
          type="button"
          onClick={() => navigate('/flow-hub/production')}
          className="mt-6 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Return to Flow Hub
        </button>
      </section>
    </main>
  );
}
