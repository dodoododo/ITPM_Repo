import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Import Type chuẩn từ file index.ts của bạn
import { type Department, type User, type Project } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Building2, Users, FolderKanban, Plus, Loader2 } from 'lucide-react';

const DEPT_COLORS = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706'];

// --- 1. Mock Data (Thay thế API thật) ---
const MOCK_DEPTS: Department[] = [
  { id: 'd1', name: 'Phòng Kỹ Thuật', description: 'Phát triển lõi AI và OCR', color: '#2563EB', member_ids: ['u1', 'u2'] },
  { id: 'd2', name: 'Ban Giám Đốc', description: 'Quản lý chiến lược', color: '#DC2626', member_ids: ['u1'] },
];

const MOCK_USERS: User[] = [
  { id: 'u1', full_name: 'Tăng Ngọc Hậu', email: 'hau@itpm.pro', avatar: '' },
  { id: 'u2', full_name: 'Nguyễn Văn A', email: 'vana@itpm.pro', avatar: '' },
];

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'ITPM Workflow', department_id: 'd1', status: 'active', progress: 45, color: '#2563EB' },
];

// --- 2. Interface cho Modal Props ---
interface CreateDeptModalProps {
  open: boolean;
  onClose: () => void;
}

interface DeptForm {
  name: string;
  description: string;
  color: string;
  member_ids: string[];
}

function CreateDeptModal({ open, onClose }: CreateDeptModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<DeptForm>({ 
    name: '', 
    description: '', 
    color: DEPT_COLORS[0], 
    member_ids: [] 
  });

  const set = (k: keyof DeptForm, v: any) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async (data: DeptForm) => {
      console.log("Mock Create Dept:", data);
      await new Promise(resolve => setTimeout(resolve, 800));
      return { id: Math.random().toString(), ...data };
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['departments'] }); 
      onClose(); 
      setForm({ name: '', description: '', color: DEPT_COLORS[0], member_ids: [] }); 
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Tạo phòng ban mới</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tên phòng ban *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nhập tên..." />
          </div>
          <div>
            <Label>Mô tả</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Mô tả ngắn..." />
          </div>
          <div>
            <Label>Màu sắc đại diện</Label>
            <div className="flex gap-2 mt-2">
              {DEPT_COLORS.map(c => (
                <button 
                  key={c} 
                  type="button" 
                  onClick={() => set('color', c)}
                  className="w-7 h-7 rounded-full transition-all hover:scale-110 shadow-sm"
                  style={{ 
                    backgroundColor: c, 
                    outline: form.color === c ? `2px solid ${c}` : 'none', 
                    outlineOffset: '2px',
                    opacity: form.color === c ? 1 : 0.6
                  }} 
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button disabled={!form.name || mutation.isPending} onClick={() => mutation.mutate(form)}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tạo phòng ban'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Departments() {
  const [showCreate, setShowCreate] = useState(false);

  // Queries dùng Mock Data
  const { data: departments = [], isLoading } = useQuery<Department[]>({ 
    queryKey: ['departments'], 
    queryFn: async () => MOCK_DEPTS 
  });
  
  const { data: users = [] } = useQuery<User[]>({ 
    queryKey: ['users'], 
    queryFn: async () => MOCK_USERS, 
    staleTime: 5 * 60 * 1000 
  });

  const { data: projects = [] } = useQuery<Project[]>({ 
    queryKey: ['projects'], 
    queryFn: async () => MOCK_PROJECTS 
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Cơ cấu Phòng ban</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Quản lý sơ đồ tổ chức và nhân sự trực thuộc.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shadow-sm font-bold">
          <Plus className="w-4 h-4" /> Tạo phòng ban
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {departments.map((dept: Department) => {
            const members = users.filter((u: User) => dept.member_ids?.includes(u.id));
            const deptProjects = projects.filter((p: Project) => p.department_id === dept.id);

            return (
              <Link key={dept.id} to={`/departments/${dept.id}`}
                className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 block group">
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner" 
                      style={{ backgroundColor: (dept.color || '#2563EB') + '15' }}>
                      <Building2 className="w-6 h-6" style={{ color: dept.color || '#2563EB' }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{dept.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{dept.description || 'Không có mô tả'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{members.length} Người</span>
                    <span className="flex items-center gap-1.5"><FolderKanban className="w-3.5 h-3.5" />{deptProjects.length} Dự án</span>
                  </div>
                </div>

                {/* Avatar stack */}
                <div className="border-t border-border/50 px-6 py-4 bg-accent/5">
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2.5">
                      {members.slice(0, 5).map((m: User) => (
                        <Avatar key={m.id} className="h-8 w-8 border-2 border-card ring-1 ring-border shadow-sm">
                          <AvatarImage src={m.avatar} />
                          <AvatarFallback className="text-[10px] font-bold">{m.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                      ))}
                      {members.length > 5 && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border-2 border-card text-[10px] font-bold text-muted-foreground">
                          +{members.length - 5}
                        </div>
                      )}
                      {members.length === 0 && <span className="text-[10px] italic text-muted-foreground/60 font-medium tracking-normal">Chưa có nhân sự</span>}
                    </div>
                    <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase">Chi tiết →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Hiển thị khi không có data */}
      {!isLoading && departments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 bg-accent/10 rounded-2xl border-2 border-dashed border-border">
          <Building2 className="w-12 h-12 mb-4 text-muted-foreground/30" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Hệ thống chưa có phòng ban</p>
          <Button variant="link" onClick={() => setShowCreate(true)} className="mt-2 text-primary">Tạo ngay phòng ban đầu tiên</Button>
        </div>
      )}

      <CreateDeptModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}