import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import { type User } from '@/types'; // Import interface User từ file index.ts đã tạo

// --- Interface cho Context ---
interface AuthError {
  type: string;
  message: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: AuthError | null;
  appPublicSettings: any;
  authChecked: boolean;
  logout: (shouldRedirect?: boolean) => void;
  navigateToLogin: () => void;
  checkUserAuth: () => Promise<void>;
  checkAppState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Mock Data ---
const MOCK_USER: User = {
  id: 'u1',
  full_name: 'Tăng Ngọc Hậu',
  email: 'hau@itpm.pro',
  avatar: '',
  role: 'Administrator'
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState<any>(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      // Giả lập load settings ứng dụng
      await new Promise(r => setTimeout(r, 500));
      setAppPublicSettings({ id: 'app-itpm', public_settings: {} });
      
      // Giả lập tự động đăng nhập luôn để Hậu làm UI cho sướng
      await checkUserAuth();
      
      setIsLoadingPublicSettings(false);
    } catch (error: any) {
      setAuthError({ type: 'unknown', message: error.message });
      setIsLoadingPublicSettings(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      // Giả lập API check Me
      await new Promise(r => setTimeout(r, 600));
      setUser(MOCK_USER);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error: any) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
    }
  };

  const logout = (shouldRedirect = true) => {
    console.log("Mock Logout");
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    console.log("Mock Redirect to Login");
  };

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
      checkAppState
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