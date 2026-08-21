import { createContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import * as authService from '../services/authService';
import { getAccessToken, onAuthFailure, setAccessToken } from '../services/api';
import type { LoginPayload, RegisterPayload, User } from '../types/auth';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for auth failure notifications from api client (e.g. background session expiration)
    const unsubscribe = onAuthFailure(() => {
      setUser(null);
    });

    let isMounted = true;

    async function restoreSession() {
      const existingToken = getAccessToken();

      if (existingToken) {
        try {
          // If token is expired, the Axios interceptor will refresh and retry /auth/me
          const currentUser = await authService.getCurrentUser();
          if (isMounted) {
            setUser(currentUser);
          }
        } catch {
          if (isMounted) {
            setAccessToken(null);
            setUser(null);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      } else {
        // If accessToken is missing, attempt refresh-first with HttpOnly cookie
        try {
          const refreshData = await authService.refreshToken();
          if (refreshData?.accessToken) {
            setAccessToken(refreshData.accessToken);
            const currentUser = await authService.getCurrentUser();
            if (isMounted) {
              setUser(currentUser);
            }
          } else if (isMounted) {
            setAccessToken(null);
            setUser(null);
          }
        } catch {
          if (isMounted) {
            setAccessToken(null);
            setUser(null);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      async login(payload) {
        const data = await authService.login(payload);
        setAccessToken(data.accessToken);
        setUser(data.user);
        return data.user;
      },
      async register(payload) {
        await authService.register(payload);
      },
      async logout() {
        try {
          await authService.logout();
        } catch {
          // Always ensure frontend session is cleared even if backend call errors
        } finally {
          setAccessToken(null);
          setUser(null);
        }
      },
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
