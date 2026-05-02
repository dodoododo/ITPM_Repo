import { useState, type ReactNode } from 'react'; // Thêm type ReactNode
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/lib/AppContext.tsx';
// Import Type chuẩn
import { type Project, type Department, type User } from '@/types';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Building2, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  type LucideIcon 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// --- 1. Mock Data (Thay thế API thật) ---
// --- 1. Mock Data (Đã xóa các trường thừa gây lỗi) ---
const MOCK_USER: User = {
  id: 'u1',
  full_name: 'Tăng Ngọc Hậu',
  email: 'hau@itpm.pro',
  avatar: ''
};

const MOCK_PROJECTS: Project[] = [
  { 
    id: 'p1', 
    name: 'Hệ thống Quản lý Dự án', 
    status: 'active', 
    progress: 45, 
    color: '#2563EB' 
  },
  { 
    id: 'p2', 
    name: 'App Học Tiếng Nhật AI', 
    status: 'planning', 
    progress: 0, 
    color: '#7C3AED' 
  },
];

const MOCK_DEPTS: Department[] = [
  { id: 'd1', name: 'Phòng Kỹ Thuật', color: '#059669' },
  { id: 'd2', name: 'Ban Giám Đốc', color: '#DC2626' },
];

// --- 2. Interface cho NavItem Props ---
interface NavItemProps {
  path: string;
  icon: LucideIcon;
  label: string;
  children?: ReactNode;
  open?: boolean;
  onToggle?: () => void;
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppContext();
  const location = useLocation();
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [deptsOpen, setDeptsOpen] = useState(false);

  // --- 3. Queries dùng Mock Data ---
  const { data: currentUser } = useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => MOCK_USER,
    staleTime: 10 * 60 * 1000,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => MOCK_PROJECTS,
    staleTime: 60 * 1000,
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => MOCK_DEPTS,
    staleTime: 60 * 1000,
  });

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // --- Component con NavItem ---
  const NavItem = ({ path, icon: Icon, label, children, open, onToggle }: NavItemProps) => {
    const active = isActive(path);
    const hasChildren = !!children;

    const content = (
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
          active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Link 
          to={path} 
          className="flex items-center gap-3 flex-1 min-w-0" 
          onClick={(e) => {
            if (hasChildren && !sidebarCollapsed) {
              e.preventDefault();
              onToggle?.();
            }
          }}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {!sidebarCollapsed && <span className="whitespace-nowrap flex-1 truncate">{label}</span>}
        </Link>
        {hasChildren && !sidebarCollapsed && (
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle?.(); }} 
            className="p-0.5 hover:bg-black/10 rounded"
          >
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", open && "rotate-180")} />
          </button>
        )}
      </div>
    );

    return (
      <div className="w-full">
        {sidebarCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent side="right" className={cn(hasChildren && "p-2 w-48")}>
              {hasChildren ? (
                <div className="space-y-1">
                  <p className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
                  {children}
                </div>
              ) : label}
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            {content}
            {open && children && (
              <div className="mt-1 ml-4 pl-3 border-l border-border space-y-1">
                {children}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-30 transition-all duration-300",
        sidebarCollapsed ? "w-[68px]" : "w-[240px]"
      )}>
        {/* Logo */}
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

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem path="/" icon={LayoutDashboard} label="Dashboard" />

          <NavItem
            path="/projects"
            icon={FolderKanban}
            label="Dự án"
            open={projectsOpen}
            onToggle={() => setProjectsOpen(v => !v)}
          >
            {projects.map((p: Project) => (
              <Link key={p.id} to={`/projects/${p.id}`}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                  location.pathname === `/projects/${p.id}`
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || '#2563EB' }} />
                <span className="truncate">{p.name}</span>
              </Link>
            ))}
          </NavItem>

          <NavItem
            path="/departments"
            icon={Building2}
            label="Phòng ban"
            open={deptsOpen}
            onToggle={() => setDeptsOpen(v => !v)}
          >
            {departments.map((d: Department) => (
              <Link key={d.id} to={`/departments/${d.id}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color || '#10B981' }} />
                <span className="truncate">{d.name}</span>
              </Link>
            ))}
          </NavItem>

          <NavItem path="/settings" icon={Settings} label="Cài đặt" />
        </nav>

        {/* Footer: User Profile */}
        <div className="border-t border-border p-4 bg-accent/5">
          <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
            <Avatar className="h-8 w-8 border border-border shadow-sm flex-shrink-0">
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback className="text-[10px] font-bold">
                {currentUser?.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{currentUser?.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{currentUser?.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Button */}
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