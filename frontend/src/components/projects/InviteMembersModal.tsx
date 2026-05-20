import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Building2, UserPlus, Loader2 } from 'lucide-react';
import { type Project } from '@/types';

// --- 1. Định nghĩa Interfaces ---
interface User {
  id: string;
  full_name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface Department {
  id: string;
  name: string;
  member_ids: string[];
}
[];

interface InviteMembersModalProps {
  open: boolean;
  onClose: () => void;
  project: Project | null;
}

// --- 2. Mock Data ---
const MOCK_USERS: User[] = [
  { id: 'u1', full_name: 'Tăng Ngọc Hậu', email: 'hau@example.com', role: 'Lead Developer' },
  { id: 'u2', full_name: 'Nguyễn Văn A', email: 'vana@example.com', role: 'Designer' },
  { id: 'u3', full_name: 'Trần Thị B', email: 'thib@example.com', role: 'Tester' },
];

const MOCK_DEPARTMENTS: Department[] = [
  { id: 'd1', name: 'Phòng Kỹ thuật', member_ids: ['u1', 'u2'] },
  { id: 'd2', name: 'Phòng Design', member_ids: ['u3'] },
];

export default function InviteMembersModal({ open, onClose, project }: InviteMembersModalProps) {
  const qc = useQueryClient();
  const initialMemberIds = (project?.member_ids || [])
    .map((member) => (typeof member === 'string' ? member : member._id || member.id || ''))
    .filter(Boolean);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialMemberIds));
  const [selectedDept, setSelectedDept] = useState('');

  // Thay thế base44 bằng mock query
  const { data: departments = [] } = useQuery<Department[]>({ 
    queryKey: ['departments'], 
    queryFn: async () => MOCK_DEPARTMENTS 
  });
  
  const { data: users = [] } = useQuery<User[]>({ 
    queryKey: ['users'], 
    queryFn: async () => MOCK_USERS,
    staleTime: 5 * 60 * 1000 
  });

  const mutation = useMutation({
    // Giả lập cập nhật project
    mutationFn: async (member_ids: string[]) => {
      console.log("Updating project members to:", member_ids);
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      if (project) qc.invalidateQueries({ queryKey: ['project', project.id] });
      onClose();
    },
  });

  const deptMembers = selectedDept
    ? users.filter((u: User) => departments.find((d: Department) => d.id === selectedDept)?.member_ids?.includes(u.id))
    : [];

  const toggle = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectAll = () => setSelectedIds(prev => {
    const next = new Set(prev);
    deptMembers.forEach((m: User) => next.add(m.id));
    return next;
  });

  const selectedUsers = users.filter((u: User) => selectedIds.has(u.id));

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Mời thành viên — {project.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-2">
          {/* Selected members chips */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />Thành viên đã chọn ({selectedIds.size})
            </h4>
            <div className="flex flex-wrap gap-2 min-h-[36px]">
              {selectedUsers.map((u: User) => (
                <div key={u.id} className="flex items-center gap-2 bg-accent rounded-full px-3 py-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback className="text-[8px]">{u.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{u.full_name}</span>
                  <button onClick={() => toggle(u.id)} className="text-muted-foreground hover:text-destructive text-xs ml-0.5">✕</button>
                </div>
              ))}
              {selectedIds.size === 0 && <p className="text-sm text-muted-foreground">Chưa chọn thành viên nào.</p>}
            </div>
          </div>

          {/* Department filter */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" />Mời từ phòng ban
            </h4>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger><SelectValue placeholder="Chọn phòng ban để lọc thành viên..." /></SelectTrigger>
              <SelectContent>
                {departments.map((d: Department) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.member_ids?.length || 0} người)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Members list */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-accent/50 px-4 py-2 flex items-center justify-between border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {selectedDept ? departments.find((d: Department) => d.id === selectedDept)?.name : "Tất cả người dùng"}
              </span>
              {selectedDept && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>Chọn tất cả</Button>
              )}
            </div>
            
            <div className="divide-y divide-border max-h-60 overflow-y-auto">
              {(selectedDept ? deptMembers : users).map((member: User) => (
                <label key={member.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 cursor-pointer">
                  <Checkbox 
                    checked={selectedIds.has(member.id)} 
                    onCheckedChange={() => toggle(member.id)} 
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-xs">{member.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Badge variant="secondary" className="text-[11px]">{member.role || 'Employee'}</Badge>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button onClick={() => mutation.mutate(Array.from(selectedIds))} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu thay đổi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
