import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from './api';
import type { User, Workspace } from '@/types';

interface AuthState {
  user: User | null;
  workspaces: Workspace[];
  loading: boolean;
  refresh: () => Promise<void>;
  setSession: (user: User) => void;
  clearSession: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ user: User; workspaces: Workspace[] }>('/auth/me');
      setUser(res.user);
      setWorkspaces(res.workspaces);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) console.error(err);
      setUser(null);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSession = useCallback((nextUser: User) => {
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setWorkspaces([]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, workspaces, loading, refresh, setSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}
