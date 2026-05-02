import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
// Import không kèm đuôi file
import { QueryClientInstance } from '@/lib/query-client' 
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { AppProvider } from '@/lib/AppContext';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Departments from '@/pages/Departments';
import DepartmentDetail from '@/pages/DepartmentDetail';
import Settings from '@/pages/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-bold text-lg">W</span>
          </div>
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <AppProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/departments/:id" element={<DepartmentDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </AppProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={QueryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;