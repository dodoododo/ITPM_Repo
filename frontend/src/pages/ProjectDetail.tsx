import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
// Import các Type chuẩn từ file index.ts
import { type Project, type Task, type User, type Department, type ProjectStatus } from '@/types';
import KanbanBoard from '@/components/tasks/KanbanBoard'; // Đã sửa bỏ đuôi .tsx
import ListView from '@/components/tasks/ListView';
import GanttChart from '@/components/tasks/GanttChart';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import InviteMembersModal from '@/components/projects/InviteMembersModal';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, UserPlus, LayoutGrid, List, BarChart3, 
  ArrowLeft, Loader2, Settings, MoreHorizontal, CheckCircle2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- 1. Mock Data ---
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

// Cấu hình trạng thái dự án chuẩn Base
const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; classes: string }> = {
  planning: { label: 'Lập kế hoạch', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  active: { label: 'Đang chạy', classes: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  completed: { label: 'Hoàn thành', classes: 'bg-blue-50 text-blue-600 border-blue-200' },
  on_hold: { label: 'Tạm dừng', classes: 'bg-amber-50 text-amber-600 border-amber-200' },
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = id || '';

  const [view, setView] = useState('kanban');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // --- 2. Queries ---
  const { data: project, isLoading } = useQuery<Project | null>({
    queryKey: ['project', projectId],
    queryFn: async () => MOCK_PROJECT,
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

  // --- 3. Logic ---
  const userMap = useMemo(() => Object.fromEntries(users.map((u: User) => [u.id, u])), [users]);
  const dept = useMemo(() => departments.find((d: Department) => d.id === project?.department_id), [departments, project]);
  const memberUsers = useMemo(() => (project?.member_ids || []).map(id => userMap[id]).filter((u): u is User => !!u), [project, userMap]);

  const stats = useMemo(() => {
    const done = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : project?.progress || 0;
    return { done, total, percentage };
  }, [tasks, project]);

  const statusCfg = project ? PROJECT_STATUS_CONFIG[project.status] : PROJECT_STATUS_CONFIG.planning;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500 font-medium">Không tìm thấy dự án.</p>
        <Link to="/projects" className="text-emerald-600 text-[13px] mt-4 font-semibold hover:underline">← Quay lại danh sách</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white -mx-6 -mt-6">
      {/* 1. TOP HEADER (Chuẩn Base) */}
      <div className="bg-white px-6 pt-5 flex-shrink-0 z-10">
        {/* Breadcrumb & Title */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md flex items-center justify-center mt-0.5 shrink-0" style={{ backgroundColor: project.color || '#2563EB' }}>
              <span className="text-lg font-bold text-white">{project.name[0]}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link to="/projects" className="text-[13px] text-slate-400 hover:text-emerald-600 transition-colors">Dự án</Link>
                <span className="text-slate-300">/</span>
                <h1 className="text-[18px] font-semibold text-slate-900 leading-tight">{project.name}</h1>
                <Badge variant="outline" className={cn("text-[11px] font-medium px-2 py-0 h-5 border", statusCfg.classes)}>
                  {statusCfg.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[12px] text-slate-500">
                {dept && <span>Phòng ban: <span className="font-medium text-slate-700">{dept.name}</span></span>}
                <span>•</span>
                <span className="truncate max-w-md">{project.description}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Thành viên */}
            <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
              <div className="flex -space-x-1.5">
                {memberUsers.slice(0, 4).map((m: User) => (
                  <Avatar key={m.id} className="h-7 w-7 border-2 border-white">
                    <AvatarImage src={m.avatar} />
                    <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600 font-medium">{m.full_name[0]}</AvatarFallback>
                  </Avatar>
                ))}
                {memberUsers.length > 4 && (
                  <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white text-[10px] font-medium text-slate-600 z-10">
                    +{memberUsers.length - 4}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowInvite(true)} className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-200 text-slate-500">
                <UserPlus className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Button variant="outline" size="sm" className="h-8 text-[13px] font-medium border-slate-300 text-slate-700">
              <Settings className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Tùy chỉnh
            </Button>
            <Button size="sm" onClick={() => setShowCreateTask(true)} className="h-8 text-[13px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-none">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Giao việc mới
            </Button>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 max-w-sm flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full transition-all duration-1000 ease-in-out" 
                style={{ width: `${stats.percentage}%`, backgroundColor: project.color || '#10b981' }} 
              />
            </div>
            <span className="text-[12px] font-semibold text-slate-700 w-8">{stats.percentage}%</span>
          </div>
          <div className="text-[12px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Đã hoàn thành {stats.done}/{stats.total} công việc
          </div>
        </div>

        {/* View Tabs (Underline Style) */}
        <div className="flex gap-6 border-b border-slate-200">
          {[
            { id: 'kanban', icon: LayoutGrid, label: 'Kanban Board' },
            { id: 'list', icon: List, label: 'Danh sách' },
            { id: 'gantt', icon: BarChart3, label: 'Timeline (Gantt)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={cn(
                "pb-2.5 text-[13px] font-medium transition-colors relative flex items-center gap-1.5",
                view === tab.id 
                  ? "text-emerald-600" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              {view === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 bg-slate-50 overflow-auto">
        {/* Render Kanban/List/Gantt */}
        {/* Truyền flex-1 và h-full vào bên trong các component con nếu chúng hỗ trợ để lấp đầy màn hình */}
        <div className="h-full min-h-[480px] p-5">
          {view === 'kanban' && <KanbanBoard projectId={projectId} tasks={tasks} users={users} />}
          {view === 'list' && <ListView projectId={projectId} tasks={tasks} users={users} />}
          {view === 'gantt' && <GanttChart projectId={projectId} tasks={tasks} users={users} />}
        </div>
      </div>

      {/* 3. MODALS */}
      <CreateTaskModal open={showCreateTask} onClose={() => setShowCreateTask(false)} defaultProjectId={projectId} />
      <InviteMembersModal 
        open={showInvite} 
        onClose={() => setShowInvite(false)} 
        project={project as Project} 
      />
    </div>
  );
}