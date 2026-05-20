import { Link, useLocation } from 'react-router-dom';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Mail,
  Settings,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppContext } from '@/lib/AppContext.tsx';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

interface NavItemProps {
  path: string;
  icon: LucideIcon;
  label: string;
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppContext();
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navItems: NavItemProps[] = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/my-tasks', icon: UserCheck, label: 'Viec cua toi' },
    { path: '/projects', icon: FolderKanban, label: 'Du an' },
    { path: '/invitations', icon: Mail, label: 'Loi moi' },
    { path: '/departments', icon: Building2, label: 'Phong ban' },
    { path: '/settings', icon: Settings, label: 'Cai dat' },
  ];

  const NavItem = ({ path, icon: Icon, label }: NavItemProps) => {
    const content = (
      <Link
        to={path}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          isActive(path)
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!sidebarCollapsed && <span className="whitespace-nowrap truncate">{label}</span>}
      </Link>
    );

    if (!sidebarCollapsed) {
      return content;
    }

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
        'fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-30 transition-all duration-300',
        sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'
      )}>
        <div className="h-16 flex items-center px-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-primary-foreground font-bold text-sm">W</span>
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-foreground whitespace-nowrap tracking-tight">WeWork</span>
            )}
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>

        <div className="border-t border-border p-4 bg-accent/5">
          <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
            <Avatar className="h-8 w-8 border border-border shadow-sm flex-shrink-0">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="text-[10px] font-bold">
                {user?.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{user?.full_name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email || ''}</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shadow-sm z-50 hover:scale-110"
        >
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>
    </TooltipProvider>
  );
}
