import { useAuth } from '@/lib/AuthContext';

export default function RequireAuth({ children }) {
  const { user, isAuthenticated, isLoadingAuth, authChecked, navigateToLogin } = useAuth();
  if (isLoadingAuth || !authChecked) return <div className="fixed inset-0 flex items-center justify-center bg-background" role="status"><span className="text-sm text-muted-foreground">Verifying access…</span></div>;
  if (!isAuthenticated || !user) return <div className="mx-auto mt-20 max-w-md rounded-xl border border-border bg-card p-6 text-center" role="alert"><h1 className="text-lg font-semibold">Sign-in required</h1><button className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={navigateToLogin}>Sign in</button></div>;
  if (!user.orgId) return <div className="mx-auto mt-20 max-w-md rounded-xl border border-red-500/30 bg-card p-6" role="alert"><h1 className="text-lg font-semibold text-red-400">Tenant access denied</h1><p className="mt-2 text-sm text-muted-foreground">Select an active organization where you hold membership.</p></div>;
  return children;
}
