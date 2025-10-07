import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  clearAuth,
  getAuthToken,
  getAuthUser,
  AuthUser,
} from '../lib/authStorage';
import { login as loginRequest } from '../services/authService';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    token: null,
    user: null,
  });

  useEffect(() => {
    (async () => {
      const [token, user] = await Promise.all([getAuthToken(), getAuthUser()]);
      setState({
        isLoading: false,
        isAuthenticated: !!token,
        token: token,
        user: user,
      });
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await loginRequest({ email, password });
    setState({
      isLoading: false,
      isAuthenticated: true,
      token: token,
      user: user ?? null,
    });
  }, []);

  const logout = useCallback(async () => {
    await clearAuth();
    setState({
      isLoading: false,
      isAuthenticated: false,
      token: null,
      user: null,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
