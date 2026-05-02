import { useState, type FormEvent } from 'react'; // Bỏ React import thừa, thêm FormEvent
import { useAppContext } from '@/lib/AppContext.tsx';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

// 1. Định nghĩa Interface cho Form và Props
interface ProjectForm {
  name: string;
  description: string;
  department: string;
  color: string;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  members: string[];
}

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

const COLORS = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706', '#0891B2'];

export default function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  // Lưu ý: Đảm bảo AppContext đã export đúng kiểu cho departments và addProject
  const { departments, addProject } = useAppContext();

  const [form, setForm] = useState<ProjectForm>({
    name: '', 
    description: '', 
    department: '', 
    color: COLORS[0],
    startDate: '', 
    endDate: '', 
    status: 'planning', 
    progress: 0, 
    members: [],
  });

  // Fix lỗi tham số k, v có kiểu any
  const set = (k: keyof ProjectForm, v: any) => setForm(p => ({ ...p, [k]: v }));

  // Fix lỗi tham số e có kiểu any
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    
    addProject(form);
    
    // Reset form
    setForm({ 
      name: '', description: '', department: '', color: COLORS[0], 
      startDate: '', endDate: '', status: 'planning', progress: 0, members: [] 
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo dự án mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tên dự án *</Label>
            <Input 
              value={form.name} 
              onChange={e => set('name', e.target.value)} 
              placeholder="Nhập tên dự án..." 
            />
          </div>
          <div>
            <Label>Mô tả</Label>
            <Textarea 
              value={form.description} 
              onChange={e => set('description', e.target.value)} 
              placeholder="Mô tả ngắn về dự án..." 
              rows={3} 
            />
          </div>
          <div>
            <Label>Phòng ban</Label>
            <Select value={form.department} onValueChange={v => set('department', v)}>
              <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
              <SelectContent>
                {/* Fix lỗi d implicitly has any type */}
                {departments && departments.length > 0 ? (
                  departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>Không có phòng ban</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Màu sắc</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ 
                    backgroundColor: c, 
                    borderColor: form.color === c ? c : 'transparent', 
                    outline: form.color === c ? `2px solid ${c}` : 'none', 
                    outlineOffset: '2px' 
                  }}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ngày bắt đầu</Label>
              <Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <Label>Ngày kết thúc</Label>
              <Input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit">Tạo dự án</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}