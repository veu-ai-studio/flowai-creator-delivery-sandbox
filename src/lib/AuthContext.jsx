import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

const AuthContext = createContext();

export function buildRequestContextFetchInit({ signal, token } = {}) {
  const headers = { accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return {
    method: 'GET',
    credentials: 'include',
    headers,
    signal,
  };
}

export async function resolveClerkBearerToken(clerkAuth) {
  if (!clerkAuth?.isLoaded || !clerkAuth?.isSignedIn || typeof clerkAuth.getToken !== 'function') {
    return null;
  }
  return clerkAuth.getToken();
}

async function fetchRequestContext({ signal, clerkAuth } = {}) {
  const token = await resolveClerkBearerToken(clerkAuth);
  const res = await fetch('/api/me', {
    ...buildRequestContextFetchInit({ signal, token }),
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

export const AuthProvider = ({ children, clerkAuth = null }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const checkUserAuth = useCallback(async ({ signal } = {}) => {
    if (clerkAuth && !clerkAuth.isLoaded) {
      setIsLoadingAuth(true);
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      return;
    }

    setIsLoadingAuth(true);
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    try {
      const context = await fetchRequestContext({ signal, clerkAuth });
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
  }, [clerkAuth]);

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

export const ClerkAwareAuthProvider = ({ children }) => {
  const clerkAuth = useClerkAuth();
  return <AuthProvider clerkAuth={clerkAuth}>{children}</AuthProvider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
