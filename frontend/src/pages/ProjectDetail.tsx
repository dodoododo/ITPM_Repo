import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
// Import các Type chuẩn từ file index.ts của mày
import { type Project, type Task, type User, type Department, type ProjectStatus } from '@/types';
import KanbanBoard from '@/components/tasks/KanbanBoard.tsx';
import ListView from '@/components/tasks/ListView';
import GanttChart from '@/components/tasks/GanttChart';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import InviteMembersModal from '@/components/projects/InviteMembersModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, UserPlus, LayoutGrid, List, BarChart3, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- 1. Mock Data (Thay thế API base44) ---
const MOCK_PROJECT: Project = {
  id: 'p1',
  name: 'Hệ thống Quản lý ITPM',
  description: 'Dự án xây dựng nền tảng quản lý công việc cho sinh viên DUT.',
  status: 'active',
  progress: 45,
  color: '#2563EB',
  department_id: 'd1',
  member_ids: ['u1', 'u2']
};

const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Thiết kế giao diện Kanban', project_id: 'p1', status: 'in_progress', priority: 'high', attachment_count: 3, assignee_id: 'u1' },
  { id: 't2', title: 'Viết API cho Task', project_id: 'p1', status: 'todo', priority: 'medium', attachment_count: 1, assignee_id: 'u2' },
];

const MOCK_DEPTS: Department[] = [
  { id: 'd1', name: 'Phòng Kỹ Thuật', color: '#2563EB' }
];

const MOCK_USERS: User[] = [
  { id: 'u1', full_name: 'Tăng Ngọc Hậu', email: 'hau@itpm.pro', avatar: '' },
  { id: 'u2', full_name: 'Nguyễn Văn A', email: 'vana@itpm.pro', avatar: '' },
];

// Cấu hình trạng thái dự án
const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  planning: { label: 'Lập kế hoạch', color: 'bg-slate-100 text-slate-600' },
  active: { label: 'Đang chạy', color: 'bg-blue-100 text-blue-600' },
  completed: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-600' },
  on_hold: { label: 'Tạm dừng', color: 'bg-amber-100 text-amber-600' },
};

export default function ProjectDetail() {
  // Lấy ID từ URL và xử lý trường hợp undefined
  const { id } = useParams<{ id: string }>();
  const projectId = id || '';

  const [view, setView] = useState('kanban');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // --- 2. Queries sử dụng Mock Data ---
  const { data: project, isLoading } = useQuery<Project | null>({
    queryKey: ['project', projectId],
    queryFn: async () => MOCK_PROJECT, // Giả lập tìm dự án theo ID
    enabled: !!projectId,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    queryFn: async () => MOCK_TASKS,
    enabled: !!projectId,
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => MOCK_DEPTS,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => MOCK_USERS,
    staleTime: 5 * 60 * 1000,
  });

  // --- 3. Logic tính toán (Dùng useMemo để tối ưu) ---
  const userMap = useMemo(() => 
    Object.fromEntries(users.map((u: User) => [u.id, u])), 
  [users]);

  const dept = useMemo(() => 
    departments.find((d: Department) => d.id === project?.department_id), 
  [departments, project]);

  const memberUsers = useMemo(() => 
    (project?.member_ids || []).map(id => userMap[id]).filter((u): u is User => !!u), 
  [project, userMap]);

  const stats = useMemo(() => {
    const done = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : project?.progress || 0;
    return { done, total, percentage };
  }, [tasks, project]);

  const statusCfg = project ? PROJECT_STATUS_CONFIG[project.status] : PROJECT_STATUS_CONFIG.planning;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground font-medium">Không tìm thấy dữ án.</p>
        <Link to="/projects" className="text-primary text-sm mt-4 font-bold hover:underline">← Quay lại danh sách</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <Link to="/projects" className="p-2 hover:bg-accent rounded-full transition-colors mt-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: (project.color || '#2563EB') + '20' }}>
                <span className="text-lg font-bold" style={{ color: project.color || '#2563EB' }}>{project.name[0]}</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{project.name}</h1>
              {dept && <Badge variant="secondary" className="text-[10px] font-bold uppercase">{dept.name}</Badge>}
              <Badge variant="secondary" className={cn("text-[10px] font-bold uppercase", statusCfg.color)}>{statusCfg.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium max-w-2xl">{project.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex -space-x-2.5">
            {memberUsers.slice(0, 4).map((m: User) => (
              <Avatar key={m.id} className="h-9 w-9 border-2 border-background shadow-sm">
                <AvatarImage src={m.avatar} />
                <AvatarFallback className="text-xs font-bold">{m.full_name[0]}</AvatarFallback>
              </Avatar>
            ))}
            {memberUsers.length > 4 && (
              <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center border-2 border-background text-xs font-bold text-muted-foreground">
                +{memberUsers.length - 4}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowInvite(true)} className="gap-2 font-bold shadow-sm">
            <UserPlus className="w-4 h-4" /> Mời
          </Button>
          <Button size="sm" onClick={() => setShowCreateTask(true)} className="gap-2 font-bold shadow-sm">
            <Plus className="w-4 h-4" /> Thêm việc
          </Button>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tiến độ tổng thể</span>
          <span className="text-sm font-bold" style={{ color: project.color || '#2563EB' }}>
            {stats.percentage}% <span className="text-muted-foreground font-medium ml-1">({stats.done}/{stats.total} việc đã xong)</span>
          </span>
        </div>
        <div className="w-full bg-accent/50 rounded-full h-2.5">
          <div 
            className="rounded-full h-2.5 transition-all duration-1000 ease-in-out" 
            style={{ width: `${stats.percentage}%`, backgroundColor: project.color || '#2563EB' }} 
          />
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={setView} className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="kanban" className="gap-2 text-xs font-bold uppercase tracking-tight px-6"><LayoutGrid className="w-3.5 h-3.5" />Kanban</TabsTrigger>
          <TabsTrigger value="list" className="gap-2 text-xs font-bold uppercase tracking-tight px-6"><List className="w-3.5 h-3.5" />Danh sách</TabsTrigger>
          <TabsTrigger value="gantt" className="gap-2 text-xs font-bold uppercase tracking-tight px-6"><BarChart3 className="w-3.5 h-3.5" />Timeline</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content Rendering */}
      <div className="mt-6">
        {view === 'kanban' && <KanbanBoard projectId={projectId} tasks={tasks} users={users} />}
        {view === 'list' && <ListView projectId={projectId} tasks={tasks} users={users} />}
        {view === 'gantt' && <GanttChart projectId={projectId} tasks={tasks} users={users} />}
      </div>

      {/* Modals */}
      <CreateTaskModal open={showCreateTask} onClose={() => setShowCreateTask(false)} defaultProjectId={projectId} />
        <InviteMembersModal 
  open={showInvite} 
  onClose={() => setShowInvite(false)} 
  // Nếu project là null, TS sẽ chửi, nên ta đảm bảo nó là Project hoặc dùng as
  project={project as Project} 
/>
    </div>
  );
}