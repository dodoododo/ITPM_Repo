import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { QueryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AppProvider } from '@/lib/AppContext';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Departments from '@/pages/Departments';
import DepartmentDetail from '@/pages/DepartmentDetail';
import Settings from '@/pages/Settings';
import MyTasks from '@/pages/MyTasks';
import { LoginPage } from '@/pages/Auth/Login';
import { ChangePasswordPage } from '@/pages/Auth/ChangePassword';
import { AcceptInvitePage } from '@/pages/Auth/AcceptInvite';
import { ForgotPasswordPage } from '@/pages/Auth/ForgotPassword';
import { ResetPasswordPage } from '@/pages/Auth/ResetPassword';
import { InvitationsPage } from '@/pages/Invitations';

const FullscreenLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
        <span className="text-primary-foreground font-bold text-lg">W</span>
      </div>
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  </div>
);

const RequireRole = ({ roles, children }: { roles: string[]; children: ReactNode }) => {
  const { user } = useAuth();
  if (!user?.role || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return <FullscreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/invitations" element={<RequireRole roles={['admin']}><InvitationsPage /></RequireRole>} />
          <Route path="/departments" element={<RequireRole roles={['admin']}><Departments /></RequireRole>} />
          <Route path="/departments/:id" element={<RequireRole roles={['admin']}><DepartmentDetail /></RequireRole>} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/my-tasks" element={<MyTasks />} />
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
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
