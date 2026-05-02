import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend 
} from 'recharts';
import { ListChecks, AlertTriangle, TrendingUp, Clock, Loader2, type LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
// Import Type chuẩn từ file index.ts của bạn
import { type Task, type User, type Project, type TaskStatus } from '@/types';

// --- 1. Mock Data (Thay thế base44) ---
const MOCK_USERS: User[] = [
  { id: 'u1', full_name: 'Tăng Ngọc Hậu', email: 'hau@itpm.pro', avatar: '' },
  { id: 'u2', full_name: 'Nguyễn Văn A', email: 'vana@itpm.pro', avatar: '' },
];

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Hệ thống Quản lý ITPM', status: 'active', progress: 45, color: '#2563EB' },
  { id: 'p2', name: 'App AI Japanese', status: 'planning', progress: 10, color: '#7C3AED' },
];

const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Thiết kế Dashboard', project_id: 'p1', status: 'in_progress', priority: 'high', attachment_count: 2, assignee_id: 'u1', due_date: '2026-05-01' },
  { id: 't2', title: 'Fix bug Login', project_id: 'p1', status: 'done', priority: 'medium', attachment_count: 0, assignee_id: 'u1' },
  { id: 't3', title: 'Cấu hình Server', project_id: 'p2', status: 'todo', priority: 'high', attachment_count: 5, assignee_id: 'u2', due_date: '2026-04-20' },
];

const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string }> = {
  todo: { label: 'Cần làm', dot: 'bg-slate-400' },
  in_progress: { label: 'Đang làm', dot: 'bg-blue-500' },
  review: { label: 'Chờ duyệt', dot: 'bg-amber-500' },
  done: { label: 'Hoàn thành', dot: 'bg-emerald-500' },
};

const PIE_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981'];

// --- 2. StatCard Component với Props chuẩn ---
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 font-medium">{subtitle}</p>}
          {trend && (
            <p className={cn("text-[10px] font-bold mt-2 uppercase", trendUp ? "text-emerald-600" : "text-destructive")}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Queries sử dụng Mock Data
  const { data: tasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => MOCK_TASKS,
  });
  
  const { data: projects = [], isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => MOCK_PROJECTS,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => MOCK_USERS,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingTasks || loadingProjects;

  // Tính toán số liệu (Dùng useMemo để tối ưu)
  const stats = useMemo(() => {
    const total = tasks.length;
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const kpi = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, overdue, done, inProgress, kpi };
  }, [tasks]);

  const statusData = useMemo(() => 
    Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
      name: cfg.label,
      value: tasks.filter(t => t.status === key).length,
    })), [tasks]);

  const userMap = useMemo(() => 
    Object.fromEntries(users.map((u: User) => [u.id, u])), [users]);

  const performanceData = useMemo(() => 
    users.map((u: User) => {
      const userTasks = tasks.filter(t => t.assignee_id === u.id);
      return {
        name: u.full_name?.split(' ').pop() || '?',
        fullName: u.full_name,
        done: userTasks.filter(t => t.status === 'done').length,
        total: userTasks.length,
      };
    }).filter(d => d.total > 0), [tasks, users]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard Quản Trị</h1>
        <p className="text-muted-foreground text-sm mt-1">Hệ thống đo lường hiệu suất và tiến độ dự án real-time.</p>
      </div>

      {/* Grid Chỉ số */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Tổng công việc" value={stats.total} subtitle={`${projects.length} dự án đang chạy`} icon={ListChecks} />
        <StatCard title="Đang thực hiện" value={stats.inProgress} subtitle="Task đang được xử lý" icon={Clock} />
        <StatCard title="Trễ hạn" value={stats.overdue} trend={stats.overdue === 0 ? "An toàn" : "Cảnh báo"} trendUp={stats.overdue === 0} icon={AlertTriangle} />
        <StatCard title="KPI Hoàn thành" value={`${stats.kpi}%`} trend={stats.kpi > 70 ? "Vượt chỉ tiêu" : "Cần cố gắng"} trendUp={stats.kpi > 70} icon={TrendingUp} />
      </div>

      {/* Biểu đồ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Trạng thái công việc</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" strokeWidth={0}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-3 bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Hiệu suất nhân viên</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <RechartsTooltip cursor={{ fill: 'hsl(var(--accent)/0.5)' }} />
                <Bar dataKey="total" fill="hsl(var(--primary)/0.2)" radius={[4, 4, 0, 0]} name="Tổng giao" />
                <Bar dataKey="done" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Đã xong" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tiến độ dự án */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Theo dõi tiến độ dự án</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project: Project) => {
            const projTasks = tasks.filter((t: Task) => t.project_id === project.id);
            const done = projTasks.filter((t: Task) => t.status === 'done').length;
            const pct = projTasks.length > 0 ? Math.round((done / projTasks.length) * 100) : project.progress || 0;
            return (
              <div key={project.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || '#2563EB' }} />
                    <span className="text-sm font-bold text-foreground">{project.name}</span>
                  </div>
                  <span className="text-xs font-bold text-primary">{pct}%</span>
                </div>
                <div className="w-full bg-accent/50 rounded-full h-2">
                  <div 
                    className="rounded-full h-2 transition-all duration-700 ease-in-out" 
                    style={{ width: `${pct}%`, backgroundColor: project.color || '#2563EB' }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}