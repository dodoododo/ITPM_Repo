import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Import Type chuẩn từ file index.ts
import { type Project, type Department, type Task, type User, type ProjectStatus } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Plus, FolderKanban, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- 1. Cấu hình & Mock Data ---
const COLORS = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706', '#0891B2'];

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  planning: { label: 'Lập kế hoạch', color: 'bg-slate-100 text-slate-600' },
  active: { label: 'Đang chạy', color: 'bg-blue-100 text-blue-600' },
  completed: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-600' },
  on_hold: { label: 'Tạm dừng', color: 'bg-amber-100 text-amber-600' },
};

const MOCK_DEPTS: Department[] = [
  { id: 'd1', name: 'Phòng Kỹ Thuật', color: '#2563EB' },
  { id: 'd2', name: 'Ban Giám Đốc', color: '#DC2626' },
];

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Hệ thống Quản lý ITPM', description: 'Nền tảng quản lý quy trình nghiệp vụ IT.', status: 'active', progress: 45, color: '#2563EB', department_id: 'd1', member_ids: ['u1', 'u2'] },
  { id: 'p2', name: 'App Học Tiếng Nhật AI', description: 'Sử dụng OCR và GPT để học qua anime.', status: 'planning', progress: 10, color: '#7C3AED', department_id: 'd1', member_ids: ['u1'] },
];

const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Task 1', project_id: 'p1', status: 'done', priority: 'medium', attachment_count: 0 },
  { id: 't2', title: 'Task 2', project_id: 'p1', status: 'todo', priority: 'high', attachment_count: 0 },
];

const MOCK_USERS: User[] = [
  { id: 'u1', full_name: 'Tăng Ngọc Hậu', email: 'hau@itpm.pro', avatar: '' },
  { id: 'u2', full_name: 'Nguyễn Văn A', email: 'vana@itpm.pro', avatar: '' },
];

// --- 2. CreateProjectModal với Props chuẩn ---
interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

interface ProjectForm {
  name: string;
  description: string;
  department_id: string;
  color: string;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
  progress: number;
  member_ids: string[];
}

function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const qc = useQueryClient();
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: async () => MOCK_DEPTS });
  
  const [form, setForm] = useState<ProjectForm>({ 
    name: '', description: '', department_id: '', color: COLORS[0], 
    start_date: '', end_date: '', status: 'planning', progress: 0, member_ids: [] 
  });

  const set = (k: keyof ProjectForm, v: any) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async (data: ProjectForm) => {
      console.log("Mock Create Project:", data);
      await new Promise(r => setTimeout(r, 800));
      return { id: Math.random().toString(), ...data };
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['projects'] }); 
      onClose(); 
      setForm({ name: '', description: '', department_id: '', color: COLORS[0], start_date: '', end_date: '', status: 'planning', progress: 0, member_ids: [] }); 
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-bold tracking-tight">Tạo dự án mới</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div><Label className="text-xs font-bold uppercase">Tên dự án *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Hệ thống CRM..." className="mt-1" /></div>
          <div><Label className="text-xs font-bold uppercase">Mô tả</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Mục tiêu dự án..." className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold uppercase">Phòng ban</Label>
              <Select value={form.department_id} onValueChange={v => set('department_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn..." /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase">Màu sắc</Label>
              <div className="flex gap-2 mt-2">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-125 shadow-sm"
                    style={{ backgroundColor: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} className="font-bold">Hủy</Button>
          <Button disabled={!form.name || mutation.isPending} onClick={() => mutation.mutate(form)} className="font-bold">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Tạo dự án
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Projects() {
  const [showCreate, setShowCreate] = useState(false);
  
  // Queries sử dụng Mock Data
  const { data: projects = [], isLoading } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: async () => MOCK_PROJECTS });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: async () => MOCK_DEPTS });
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ['tasks'], queryFn: async () => MOCK_TASKS });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: async () => MOCK_USERS, staleTime: 5 * 60 * 1000 });

  const deptMap = useMemo(() => Object.fromEntries(departments.map(d => [d.id, d])), [departments]);
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Danh mục Dự án</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Theo dõi và điều phối toàn bộ danh mục dự án ITPM.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 font-bold shadow-sm">
          <Plus className="w-4 h-4" /> Tạo dự án
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project: Project) => {
            const dept = deptMap[project.department_id || ''];
            const projTasks = tasks.filter((t: Task) => t.project_id === project.id);
            const doneTasks = projTasks.filter((t: Task) => t.status === 'done').length;
            const pct = projTasks.length > 0 ? Math.round((doneTasks / projTasks.length) * 100) : project.progress || 0;
            const memberUsers = (project.member_ids || []).map(id => userMap[id]).filter((u): u is User => !!u);
            const statusCfg = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.planning;

            return (
              <Link key={project.id} to={`/projects/${project.id}`}
                className="group bg-card rounded-2xl border border-border p-6 hover:shadow-xl hover:border-primary/30 transition-all duration-300 block relative overflow-hidden">
                {/* Dải màu trang trí */}
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: project.color || '#2563EB' }} />
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: (project.color || '#2563EB') + '15' }}>
                      <FolderKanban className="w-6 h-6" style={{ color: project.color || '#2563EB' }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">{project.name}</h3>
                      {dept && <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{dept.name}</p>}
                    </div>
                  </div>
                  <Badge variant="secondary" className={cn("text-[10px] font-bold uppercase tracking-wider", statusCfg.color)}>
                    {statusCfg.label}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 font-medium h-10">{project.description || 'Chưa có mô tả chi tiết cho dự án này.'}</p>
                
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Tiến độ hoàn thành</span>
                    <span className="text-xs font-black" style={{ color: project.color || '#2563EB' }}>{pct}%</span>
                  </div>
                  <div className="w-full bg-accent/50 rounded-full h-2">
                    <div className="rounded-full h-2 transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: project.color || '#2563EB' }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2.5">
                      {memberUsers.slice(0, 3).map((m: User) => (
                        <Avatar key={m.id} className="h-8 w-8 border-2 border-card shadow-sm">
                          <AvatarImage src={m.avatar} />
                          <AvatarFallback className="text-[10px] font-bold">{m.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                      ))}
                      {memberUsers.length > 3 && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border-2 border-card text-[10px] font-bold text-muted-foreground">
                          +{memberUsers.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{doneTasks}/{projTasks.length} Task đã xong</span>
                  </div>
                  <div className="p-2 rounded-full group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Hiển thị khi không có dự án */}
      {!isLoading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 bg-accent/10 rounded-3xl border-2 border-dashed border-border">
          <FolderKanban className="w-14 h-14 mb-4 text-muted-foreground/20" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-center">Chưa có dự án nào được khởi tạo</p>
          <Button variant="link" onClick={() => setShowCreate(true)} className="mt-2 text-primary font-bold">Bắt đầu dự án đầu tiên ngay</Button>
        </div>
      )}

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}