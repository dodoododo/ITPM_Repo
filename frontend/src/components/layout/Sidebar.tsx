import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Mail,
  Search,
  Settings,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppContext } from '@/lib/AppContext.tsx';
import { useAuth } from '@/lib/AuthContext';
import { projectService } from '@/services/projectService';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

interface NavItemProps {
  path: string;
  icon: LucideIcon;
  label: string;
  roles?: string[];
}

const getProjectId = (project: Project) => project._id || project.id;

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppContext();
  const { user, token } = useAuth();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!token || sidebarCollapsed) return;

    let active = true;
    projectService.getProjects(token, { page: 1, limit: 20 })
      .then((response) => {
        if (active) setProjects(response.data || []);
      })
      .catch(() => {
        if (active) setProjects([]);
      });

    return () => {
      active = false;
    };
  }, [token, sidebarCollapsed]);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navItems: NavItemProps[] = [
    { path: '/', icon: LayoutDashboard, label: 'Tong quan' },
    { path: '/my-tasks', icon: UserCheck, label: 'Viec cua toi' },
    { path: '/projects', icon: FolderKanban, label: 'Du an' },
    { path: '/departments', icon: Building2, label: 'Phong ban', roles: ['admin'] },
    { path: '/invitations', icon: Mail, label: 'Nhan su', roles: ['admin'] },
    { path: '/settings', icon: Settings, label: 'Cai dat' },
  ].filter((item) => !item.roles || (user?.role && item.roles.includes(user.role)));

  const filteredProjects = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(keyword));
  }, [projects, query]);

  const NavItem = ({ path, icon: Icon, label }: NavItemProps) => {
    const content = (
      <Link
        to={path}
        className={cn(
          'group flex h-9 items-center gap-3 rounded-md px-3 text-[13px] font-semibold transition-colors',
          isActive(path)
            ? 'bg-white/10 text-white shadow-[inset_3px_0_0_#16c784]'
            : 'text-slate-300 hover:bg-white/6 hover:text-white'
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!sidebarCollapsed && <span className="truncate">{label}</span>}
      </Link>
    );

    if (!sidebarCollapsed) return content;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-white/5 bg-[#202832] text-slate-100 transition-all duration-300',
        sidebarCollapsed ? 'w-[72px]' : 'w-[256px]'
      )}>
        <div className="flex h-[61px] flex-shrink-0 items-center gap-3 border-b border-white/8 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500 text-sm font-black text-white shadow-sm">
            I
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-white">ITPM Workspace</p>
              <p className="truncate text-[11px] font-medium text-slate-400">Enterprise task & KPI</p>
            </div>
          )}
        </div>

        <div className={cn('border-b border-white/8 p-4', sidebarCollapsed && 'px-3')}>
          <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
            <Avatar className="h-9 w-9 border border-white/10">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-slate-700 text-xs font-bold text-white">
                {user?.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-white">{user?.full_name || 'User'}</p>
                <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-emerald-300">{user?.role || 'member'}</p>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tim nhanh du an..."
                className="h-9 w-full rounded-md border border-white/8 bg-slate-900/30 pl-9 pr-3 text-[12px] text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/70"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {!sidebarCollapsed && <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Navigation</p>}
            {navItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </div>

          {!sidebarCollapsed && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between px-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Projects</p>
                <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <div className="space-y-1">
                {filteredProjects.slice(0, 12).map((project) => {
                  const path = `/projects/${getProjectId(project)}`;
                  const active = location.pathname === path;
                  return (
                    <Link
                      key={getProjectId(project)}
                      to={path}
                      className={cn(
                        'flex h-9 items-center gap-2 rounded-md px-3 text-[12px] font-semibold transition-colors',
                        active ? 'bg-emerald-500/14 text-emerald-200' : 'text-slate-300 hover:bg-white/6 hover:text-white'
                      )}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color || '#16c784' }} />
                      <span className="min-w-0 flex-1 truncate">{project.name}</span>
                      <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-slate-400">{project.status}</span>
                    </Link>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <p className="px-3 py-2 text-[12px] text-slate-500">Chua co du an.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-emerald-600"
        >
          {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>
    </TooltipProvider>
  );
}
