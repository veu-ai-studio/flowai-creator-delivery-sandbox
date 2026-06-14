import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

async function fetchRequestContext({ signal } = {}) {
  const res = await fetch('/api/me', {
    method: 'GET',
    credentials: 'include',
    headers: { accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    throw new Error(`/api/me returned ${res.status}`);
  }
  return res.json();
}

function currentReturnUrl() {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}${window.location.hash}` || '/';
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const checkUserAuth = useCallback(async ({ signal } = {}) => {
    setIsLoadingAuth(true);
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    try {
      const context = await fetchRequestContext({ signal });
      const authenticated = context.authenticated === true;
      const authRequired = context.config?.authRequired === true;

      setUser(authenticated ? {
        id: context.userId,
        orgId: context.orgId,
        productId: context.productId,
        authMode: context.authMode,
      } : null);
      setIsAuthenticated(authenticated);
      setAppPublicSettings({ auth: context.config || {} });

      if (!authenticated && authRequired) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required',
        });
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: 'unknown',
        message: error?.message || 'Failed to load authentication state',
      });
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      setAuthChecked(true);
    }
  }, []);

  const checkAppState = useCallback((options) => checkUserAuth(options), [checkUserAuth]);

  useEffect(() => {
    const ac = new AbortController();
    checkUserAuth({ signal: ac.signal });
    return () => ac.abort();
  }, [checkUserAuth]);

  const logout = useCallback(async (shouldRedirect = true) => {
    try {
      if (typeof window !== 'undefined' && window.Clerk?.signOut) {
        await window.Clerk.signOut();
      }
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      if (shouldRedirect && typeof window !== 'undefined') {
        window.location.assign('/sign-in');
      }
    }
  }, []);

  const navigateToLogin = useCallback(() => {
    if (typeof window === 'undefined') return;
    const redirectUrl = encodeURIComponent(currentReturnUrl());
    window.location.assign(`/sign-in?redirect_url=${redirectUrl}`);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
