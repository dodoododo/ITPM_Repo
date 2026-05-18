import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type Project, type Department, type Task, type User, type ProjectStatus } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { 
  Plus, FolderKanban, Loader2, Search, Filter, 
  ChevronDown, MoreHorizontal, ArrowRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- 1. Mock Data ---
const COLORS = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706', '#0891B2'];

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; classes: string }> = {
  planning: { label: 'Lập kế hoạch', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  active: { label: 'Đang chạy', classes: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  completed: { label: 'Hoàn thành', classes: 'bg-blue-50 text-blue-600 border-blue-200' },
  on_hold: { label: 'Tạm dừng', classes: 'bg-amber-50 text-amber-600 border-amber-200' },
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

// --- 2. Modal Tạo Dự Án (Chuẩn Base) ---
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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-slate-200 shadow-lg">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <DialogTitle className="text-[16px] font-semibold text-slate-800">Tạo dự án mới</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-700">Tên dự án <span className="text-red-500">*</span></label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nhập tên dự án..." className="h-9 text-[13px] border-slate-300 focus-visible:ring-emerald-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-700">Mô tả mục tiêu</label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Mô tả ngắn gọn..." className="text-[13px] border-slate-300 focus-visible:ring-emerald-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-slate-700">Phòng ban</label>
              <Select value={form.department_id} onValueChange={v => set('department_id', v)}>
                <SelectTrigger className="h-9 text-[13px] border-slate-300 focus:ring-emerald-500">
                  <SelectValue placeholder="Chọn phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id} className="text-[13px]">{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-slate-700">Màu sắc</label>
              <div className="flex gap-2 pt-1">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110 shadow-sm"
                    style={{ backgroundColor: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button variant="outline" onClick={onClose} className="h-8 text-[13px] font-medium border-slate-300">Hủy</Button>
          <Button disabled={!form.name || mutation.isPending} onClick={() => mutation.mutate(form)} className="h-8 text-[13px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white">
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />} Tạo dự án
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- 3. Trang Chính Projects ---
export default function Projects() {
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const { data: projects = [], isLoading } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: async () => MOCK_PROJECTS });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: async () => MOCK_DEPTS });
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ['tasks'], queryFn: async () => MOCK_TASKS });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: async () => MOCK_USERS, staleTime: 5 * 60 * 1000 });

  const deptMap = useMemo(() => Object.fromEntries(departments.map(d => [d.id, d])), [departments]);
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white -mx-6 -mt-6">
      
      {/* HEADER & TABS */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10 px-6 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">Danh sách Dự án</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 text-[13px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-none">
              <Plus className="w-3.5 h-3.5" /> Thêm dự án
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          {[
            { id: 'all', label: 'Tất cả dự án' },
            { id: 'active', label: 'Đang chạy' },
            { id: 'completed', label: 'Đã đóng' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-3 text-[13px] font-medium transition-colors relative",
                activeTab === tab.id ? "text-emerald-600" : "text-slate-500 hover:text-slate-900"
              )}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="px-6 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Tìm kiếm dự án..." className="h-8 pl-9 text-[13px] bg-white border-slate-300 focus-visible:ring-emerald-500" />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-[13px] font-medium border-slate-300 gap-2 bg-white text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Lọc
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-[13px] font-medium text-slate-600 hover:bg-slate-200">
            Phòng ban <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* PROJECT LIST (High Density Table View) */}
      <div className="flex-1 overflow-auto bg-white p-6">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 border-dashed rounded-lg bg-slate-50/50">
              <FolderKanban className="w-10 h-10 mb-3 text-slate-300" />
              <p className="text-[13px] font-medium">Chưa có dự án nào.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
              {/* Table Header */}
              <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[12px] font-medium text-slate-500 uppercase tracking-wide">
                <div className="w-10"></div>
                <div className="flex-1">Tên dự án</div>
                <div className="w-48 px-4">Tiến độ</div>
                <div className="w-32 px-4 text-center">Trạng thái</div>
                <div className="w-32 px-4 text-center">Thành viên</div>
                <div className="w-12 text-center"></div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-slate-100">
                {projects.map((project: Project) => {
                  const dept = deptMap[project.department_id || ''];
                  const projTasks = tasks.filter((t: Task) => t.project_id === project.id);
                  const doneTasks = projTasks.filter((t: Task) => t.status === 'done').length;
                  const pct = projTasks.length > 0 ? Math.round((doneTasks / projTasks.length) * 100) : project.progress || 0;
                  const memberUsers = (project.member_ids || []).map(id => userMap[id]).filter((u): u is User => !!u);
                  const statusCfg = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.planning;

                  return (
                    <Link 
                      key={project.id} 
                      to={`/projects/${project.id}`}
                      className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      {/* Icon */}
                      <div className="w-10 flex-shrink-0">
                        <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: (project.color || '#2563EB') + '20' }}>
                          <FolderKanban className="w-3.5 h-3.5" style={{ color: project.color || '#2563EB' }} />
                        </div>
                      </div>

                      {/* Name & Dept */}
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-[14px] font-medium text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                          {project.name}
                        </h3>
                        {dept && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{dept.name}</p>}
                      </div>

                      {/* Progress */}
                      <div className="w-48 px-4 flex-shrink-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-semibold text-slate-700">{pct}%</span>
                          <span className="text-[10px] text-slate-400">{doneTasks}/{projTasks.length} việc</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: project.color || '#10b981' }} />
                        </div>
                      </div>

                      {/* Status */}
                      <div className="w-32 px-4 flex-shrink-0 flex justify-center">
                        <Badge variant="outline" className={cn("text-[11px] font-medium px-2 py-0.5 border whitespace-nowrap", statusCfg.classes)}>
                          {statusCfg.label}
                        </Badge>
                      </div>

                      {/* Members */}
                      <div className="w-32 px-4 flex-shrink-0 flex justify-center">
                        <div className="flex -space-x-1.5">
                          {memberUsers.slice(0, 3).map((m: User) => (
                            <Avatar key={m.id} className="h-6 w-6 border-2 border-white">
                              <AvatarImage src={m.avatar} />
                              <AvatarFallback className="text-[9px] bg-slate-100 text-slate-600 font-medium">{m.full_name?.[0]}</AvatarFallback>
                            </Avatar>
                          ))}
                          {memberUsers.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white text-[9px] font-medium text-slate-600 z-10">
                              +{memberUsers.length - 3}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="w-12 flex-shrink-0 flex justify-end">
                        <button className="text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-600 transition-all p-1">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}