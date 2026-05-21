import { Link, useLocation } from 'react-router-dom';
import {
  Grid3X3,
  LogOut,
  Plus,
} from 'lucide-react';
import { useAppContext } from '@/lib/AppContext.tsx';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/notifications/NotificationBell';
import { cn } from '@/lib/utils';

interface TopHeaderProps {
  onCreateNew: () => void;
}

export default function TopHeader({ onCreateNew }: TopHeaderProps) {
  const { sidebarCollapsed } = useAppContext();
  const { logout, user } = useAuth();
  const location = useLocation();
  const canCreateTask = user?.role === 'admin' || user?.role === 'manager';

  const tabs = [
    { label: 'Tong quan', path: '/', active: location.pathname === '/' || location.pathname === '/dashboard' },
    { label: 'Du an', path: '/projects', active: location.pathname.startsWith('/projects') },
    { label: 'Viec cua toi', path: '/my-tasks', active: location.pathname.startsWith('/my-tasks') },
    { label: 'Phong ban', path: '/departments', active: location.pathname.startsWith('/departments'), roles: ['admin'] },
    { label: 'Nhan su', path: '/invitations', active: location.pathname.startsWith('/invitations'), roles: ['admin'] },
    { label: 'Cai dat', path: '/settings', active: location.pathname.startsWith('/settings') },
  ].filter((tab) => !tab.roles || (user?.role && tab.roles.includes(user.role)));

  const title = (() => {
    if (location.pathname.startsWith('/projects')) return 'Project Workspace';
    if (location.pathname.startsWith('/my-tasks')) return 'My Work';
    if (location.pathname.startsWith('/departments')) return 'Departments';
    if (location.pathname.startsWith('/invitations')) return 'People & Access';
    if (location.pathname.startsWith('/settings')) return 'Workspace Settings';
    return 'Executive Dashboard';
  })();

  return (
    <header className={cn(
      'fixed right-0 top-0 z-20 h-[61px] border-b border-slate-200 bg-white/95 px-5 transition-all duration-300',
      sidebarCollapsed ? 'left-[72px]' : 'left-[256px]'
    )}>
      <div className="flex h-full items-center gap-5">
        <div className="flex min-w-[210px] items-center gap-3 border-r border-slate-200 pr-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
            <Grid3X3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[15px] font-bold text-slate-900">{title}</h1>
            </div>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">Internal task & KPI system</p>
          </div>
        </div>

        <nav className="hidden h-full min-w-0 flex-1 items-center gap-5 overflow-x-auto xl:flex">
          {tabs.map((tab) => (
            <Link
              key={`${tab.label}-${tab.path}`}
              to={tab.path}
              className={cn('enterprise-tab whitespace-nowrap', tab.active && 'enterprise-tab-active')}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {canCreateTask && (
            <Button onClick={onCreateNew} size="sm" className="h-8 gap-1.5 rounded-md bg-emerald-600 px-3 text-[12px] font-bold text-white shadow-none hover:bg-emerald-700">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tao moi</span>
            </Button>
          )}

          <div className="relative">
            <NotificationBell />
          </div>

          <Button variant="ghost" size="icon-sm" onClick={() => logout()} className="text-slate-500 hover:text-red-600">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
