import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '@/services/authService';
import { type User } from '@/types';

interface AuthError {
  type: string;
  message: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: AuthError | null;
  appPublicSettings: Record<string, unknown> | null;
  authChecked: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: (shouldRedirect?: boolean) => void;
  setAuthData: (user: User, token: string) => void;
  navigateToLogin: () => void;
  checkUserAuth: () => Promise<void>;
  checkAppState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState<Record<string, unknown> | null>(null);

  const isAuthenticated = Boolean(token && user);
  const isLoadingPublicSettings = false;
  const isLoading = isLoadingAuth;

  useEffect(() => {
    void checkAppState();
  }, []);

  const setAuthData = (nextUser: User, nextToken: string) => {
    authService.setToken(nextToken);
    authService.setCurrentUser(nextUser);
    setUser(nextUser);
    setToken(nextToken);
    setAuthError(null);
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    const savedToken = authService.getToken();
    const savedUser = authService.getCurrentUser();

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
      setAuthError(null);
    } else {
      setToken(null);
      setUser(null);
      setAuthError({ type: 'auth_required', message: 'Authentication required' });
    }

    setAuthChecked(true);
    setIsLoadingAuth(false);
  };

  const checkAppState = async () => {
    setAppPublicSettings({ appName: import.meta.env.VITE_APP_NAME || 'ITPM' });
    await checkUserAuth();
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Login failed');
    }

    setAuthData(response.data.user, response.data.token);
  };

  const logout = (shouldRedirect = true) => {
    authService.clearToken();
    setUser(null);
    setToken(null);
    setAuthError({ type: 'auth_required', message: 'Authentication required' });

    if (shouldRedirect) {
      window.location.assign('/login');
    }
  };

  const navigateToLogin = () => {
    window.location.assign('/login');
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    token,
    isAuthenticated,
    isLoading,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    authChecked,
    login,
    logout,
    setAuthData,
    navigateToLogin,
    checkUserAuth,
    checkAppState,
  }), [user, token, isAuthenticated, isLoading, isLoadingAuth, authError, appPublicSettings, authChecked]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
