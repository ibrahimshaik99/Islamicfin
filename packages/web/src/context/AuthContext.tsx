import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { User } from '../lib/types';

export interface Membership {
  communityId: string;
  communityName: string;
  communitySlug: string;
  role: string;
  status: string;
  joinedAt?: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: User | null;
  memberships: Membership[];
  status: AuthStatus;
  primaryRole: string | null;
  communityId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  isLoggingOut: boolean;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<void>;
  loadSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

function resolvePrimaryRole(memberships: Membership[]): string | null {
  if (memberships.length === 0) return null;
  const rolePriority = [
    'SUPER_ADMIN',
    'COMMUNITY_OWNER',
    'COMMUNITY_ADMIN',
    'COMMUNITY_FINANCE_MANAGER',
    'COMMUNITY_MODERATOR',
    'MERCHANT',
    'MERCHANT_STAFF',
    'CUSTOMER',
  ];
  for (const role of rolePriority) {
    if (memberships.some((m) => m.role === role)) return role;
  }
  return memberships[0].role;
}

function roleToDashboardRoute(role: string | null): string {
  if (!role) return '/';
  if (role === SUPER_ADMIN_ROLE) return '/admin';
  if (role === 'MERCHANT' || role === 'MERCHANT_STAFF') return '/merchant';
  if (role === 'CUSTOMER') return '/app';
  return '/community';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadSession = useCallback(async (signal?: AbortSignal) => {
    try {
      // Fetch all data BEFORE any state update to avoid race conditions
      const meRes = await api<{ data: User }>('/auth/me', { signal });

      let mems: Membership[] = [];
      try {
        const memRes = await api<{ data: Membership[] }>('/auth/my-memberships', { signal });
        mems = memRes.data || [];
      } catch {
        mems = [];
      }

      const isSuperAdmin = mems.some((m) => m.role === SUPER_ADMIN_ROLE);
      if (!isSuperAdmin) {
        try {
          await api('/admin/dashboard', { signal });
          mems = [{ communityId: '', communityName: 'Platform', communitySlug: 'platform', role: SUPER_ADMIN_ROLE, status: 'ACTIVE' }];
        } catch {
          // not super admin
        }
      }

      // Batch all state updates together so primaryRole is correct on first render
      setUser(meRes.data);
      setMemberships(mems);
      setStatus('authenticated');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        setMemberships([]);
        setStatus('unauthenticated');
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        // component unmounted, ignore
      } else {
        setUser(null);
        setMemberships([]);
        setStatus('unauthenticated');
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadSession(controller.signal);
    return () => controller.abort();
  }, [loadSession]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const refreshSession = async () => {
      try {
        await api('/auth/refresh', { method: 'POST' });
      } catch {
        setUser(null);
        setMemberships([]);
        setStatus('unauthenticated');
      }
    };
    const interval = setInterval(refreshSession, 15 * 60 * 1000);
    let activityTimeout: ReturnType<typeof setTimeout>;
    const onActivity = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(refreshSession, 60 * 1000);
    };
    document.addEventListener('mousemove', onActivity);
    document.addEventListener('keydown', onActivity);
    document.addEventListener('click', onActivity);
    return () => {
      clearInterval(interval);
      clearTimeout(activityTimeout);
      document.removeEventListener('mousemove', onActivity);
      document.removeEventListener('keydown', onActivity);
      document.removeEventListener('click', onActivity);
    };
  }, [status]);

  const login = async (email: string, password: string) => {
    await api('/auth/login', { method: 'POST', body: { email, password } });
    await loadSession();
  };

  const register = async (data: { email: string; password: string; name: string }) => {
    await api('/auth/register', { method: 'POST', body: data });
    await loadSession();
  };

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // logout should succeed even if API fails (clear local state)
    }
    setUser(null);
    setMemberships([]);
    setStatus('unauthenticated');
    setIsLoggingOut(false);
  };

  const forgotPassword = async (email: string): Promise<string> => {
    const res = await api<{ data: { message: string } }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
    return res.data.message;
  };

  const resetPassword = async (token: string, password: string) => {
    await api('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    });
    await loadSession();
  };

  const primaryRole = user
    ? memberships.some((m) => m.role === SUPER_ADMIN_ROLE)
      ? SUPER_ADMIN_ROLE
      : resolvePrimaryRole(memberships)
    : null;

  const communityId = primaryRole === SUPER_ADMIN_ROLE
    ? (memberships.find((m) => m.role !== SUPER_ADMIN_ROLE && m.communityId)?.communityId || memberships[0]?.communityId || null)
    : (memberships.find((m) => m.role === primaryRole)?.communityId || memberships[0]?.communityId || null);

  return (
    <AuthContext.Provider value={{
      user,
      memberships,
      status,
      primaryRole,
      communityId,
      login,
      register,
      logout,
      isLoggingOut,
      forgotPassword,
      resetPassword,
      loadSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export { roleToDashboardRoute, SUPER_ADMIN_ROLE };
