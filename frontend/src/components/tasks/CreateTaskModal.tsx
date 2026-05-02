import { useState, type FormEvent } from 'react'; // Bỏ React dư thừa, thêm type FormEvent
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Đã xóa import base44
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

// --- 1. Định nghĩa các Interface ---
interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface TaskForm {
  title: string;
  description: string;
  project_id: string;
  assignee_id: string;
  reviewer_id: string;
  priority: string;
  start_date: string;
  due_date: string;
  status: string;
  subtasks: any[];
  attachment_count: number;
}

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

const EMPTY: TaskForm = { 
  title: '', description: '', project_id: '', assignee_id: '', reviewer_id: '', 
  priority: 'medium', start_date: '', due_date: '', status: 'todo', 
  subtasks: [], attachment_count: 0 
};

// --- 2. Mock Data ---
const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Dự án AI học tiếng Nhật' },
  { id: 'p2', name: 'Web Quản lý ITPM' },
];

const MOCK_USERS: User[] = [
  { id: 'u1', full_name: 'Tăng Ngọc Hậu', email: 'hau@itpm.com' },
  { id: 'u2', full_name: 'Phó Phòng Kỹ Thuật', email: 'pho@itpm.com' },
];

export default function CreateTaskModal({ open, onClose, defaultProjectId }: CreateTaskModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<TaskForm>({ ...EMPTY, project_id: defaultProjectId || '' });

  // Fix lỗi k và v có kiểu any
  const set = (k: keyof TaskForm, v: any) => setForm(p => ({ ...p, [k]: v }));

  // Thay thế API thực bằng Mock
  const { data: projects = [] } = useQuery<Project[]>({ 
    queryKey: ['projects'], 
    queryFn: async () => MOCK_PROJECTS 
  });
  
  const { data: users = [] } = useQuery<User[]>({ 
    queryKey: ['users'], 
    queryFn: async () => MOCK_USERS, 
    staleTime: 5 * 60 * 1000 
  });

  const mutation = useMutation({
    // mutationFn nhận data kiểu TaskForm để fix lỗi 'Argument is not assignable to void'
    mutationFn: async (data: TaskForm) => {
      console.log("Đang tạo task:", data);
      await new Promise(resolve => setTimeout(resolve, 800)); // Giả lập delay
      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks', form.project_id] });
      setForm({ ...EMPTY, project_id: defaultProjectId || '' });
      onClose();
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.project_id) return;
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Tạo công việc mới</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tiêu đề *</Label>
            <Input 
              value={form.title} 
              onChange={e => set('title', e.target.value)} 
              placeholder="Nhập tiêu đề công việc..." 
            />
          </div>
          <div>
            <Label>Mô tả</Label>
            <Textarea 
              value={form.description} 
              onChange={e => set('description', e.target.value)} 
              placeholder="Mô tả chi tiết..." 
              rows={3} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dự án *</Label>
              <Select value={form.project_id} onValueChange={v => set('project_id', v)}>
                <SelectTrigger><SelectValue placeholder="Chọn dự án" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p: Project) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Độ ưu tiên</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thấp</SelectItem>
                  <SelectItem value="medium">Trung bình</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Người thực hiện</Label>
              <Select value={form.assignee_id} onValueChange={v => set('assignee_id', v)}>
                <SelectTrigger><SelectValue placeholder="Chọn người" /></SelectTrigger>
                <SelectContent>
                  {users.map((u: User) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Người duyệt</Label>
              <Select value={form.reviewer_id} onValueChange={v => set('reviewer_id', v)}>
                <SelectTrigger><SelectValue placeholder="Chọn người" /></SelectTrigger>
                <SelectContent>
                  {users.map((u: User) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ngày bắt đầu</Label>
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <Label>Hạn chót</Label>
              <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit" disabled={!form.title || !form.project_id || mutation.isPending}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tạo công việc'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}