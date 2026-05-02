import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Import các Type chuẩn từ file index.ts
import { 
  type Task, 
  type User, 
  type TaskStatus, 
  type Priority, 
  type Subtask, 
  type TaskComment 
} from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { 
  CheckCircle2, XCircle, Calendar, User as UserIcon, 
  UserCheck, Flag, Send, Loader2, Save 
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// --- Interface cho Props ---
interface TaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  projectId: string;
  users: User[];
  onUpdate?: (task: Task) => void;
}

// --- Local State Interface ---
interface TaskFields {
  assignee_id: string;
  reviewer_id: string;
  priority: Priority;
  start_date: string;
  due_date: string;
  status: TaskStatus;
}

// Cấu hình hiển thị trạng thái
const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string }> = {
  todo: { label: 'Cần làm', dot: 'bg-slate-400' },
  in_progress: { label: 'Đang làm', dot: 'bg-blue-500' },
  review: { label: 'Chờ duyệt', dot: 'bg-amber-500' },
  done: { label: 'Hoàn thành', dot: 'bg-emerald-500' },
};

export default function TaskDetailPanel({ 
  task, 
  open, 
  onClose, 
  projectId, 
  users = [], 
  onUpdate 
}: TaskDetailPanelProps) {
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState('');
  
  // Local editable fields
  const [fields, setFields] = useState<TaskFields>({
    assignee_id: '',
    reviewer_id: '',
    priority: 'medium',
    start_date: '',
    due_date: '',
    status: 'todo',
  });
  const [dirty, setDirty] = useState(false);

  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // Sync dữ liệu khi task thay đổi
  useEffect(() => {
    if (task) {
      setFields({
        assignee_id: task.assignee_id || '',
        reviewer_id: task.reviewer_id || '',
        priority: task.priority || 'medium',
        start_date: task.start_date || '',
        due_date: task.due_date || '',
        status: task.status || 'todo',
      });
      setDirty(false);
    }
  }, [task?.id]);

  const setField = (k: keyof TaskFields, v: string) => {
    setFields(p => ({ ...p, [k]: v }));
    setDirty(true);
  };

  // Mock User hiện tại (Thay thế base44.auth.me)
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: async () => ({ id: 'u1', full_name: 'Tăng Ngọc Hậu', email: 'hau@itpm.com', avatar: '' }),
    staleTime: 10 * 60 * 1000,
  });

  // Mock Comments (Thay thế base44.entities.TaskComment)
  const { data: comments = [] } = useQuery<TaskComment[]>({
    queryKey: ['comments', task?.id],
    queryFn: async () => [
      { 
        id: 'c1', 
        task_id: task?.id || '', 
        author_id: 'u2', 
        author_name: 'Sếp Tổng', 
        content: 'Tiến độ này hơi chậm nhé Hậu ơi!', 
        created_date: new Date().toISOString() 
      }
    ],
    enabled: !!task?.id && open,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      console.log("Mock Update Task:", updates);
      await new Promise(r => setTimeout(r, 600)); // Giả lập delay
      return { ...task, ...updates } as Task;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      onUpdate?.(updated);
      setDirty(false);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (newComment: any) => {
      console.log("Mock Add Comment:", newComment);
      await new Promise(r => setTimeout(r, 400));
      return { id: Math.random().toString(), ...newComment };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', task?.id] });
      setCommentText('');
    },
  });

  if (!task) return null;

  const handleSave = () => updateMutation.mutate(fields);

  const handleStatusChange = (newStatus: string) => {
    const s = newStatus as TaskStatus;
    setField('status', s);
    updateMutation.mutate({ ...fields, status: s });
    setDirty(false);
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    const updated = (task.subtasks || []).map(st =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    updateMutation.mutate({ subtasks: updated });
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    commentMutation.mutate({
      task_id: task.id,
      author_id: currentUser?.id || '',
      author_name: currentUser?.full_name || 'Ẩn danh',
      author_avatar: currentUser?.avatar || '',
      content: commentText.trim(),
    });
  };

  const subtasksDone = (task.subtasks || []).filter(s => s.done).length;
  const subtasksTotal = (task.subtasks || []).length;
  const assignee = userMap[fields.assignee_id];
  const reviewer = userMap[fields.reviewer_id];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border flex-shrink-0">
            <SheetTitle className="text-xl font-semibold text-foreground leading-tight mb-4">
              {task.title}
            </SheetTitle>

            {task.status === 'review' && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">Đang chờ phê duyệt</p>
                  <p className="text-xs text-amber-600 mt-0.5">Task cần được duyệt để hoàn thành</p>
                </div>
                <Button size="sm" onClick={() => handleStatusChange('done')} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Duyệt
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleStatusChange('in_progress')} className="border-destructive text-destructive hover:bg-destructive hover:text-white gap-1.5">
                  <XCircle className="w-4 h-4" /> Từ chối
                </Button>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 sm:grid-cols-5">
            {/* Left Content */}
            <div className="sm:col-span-3 p-6 space-y-6 overflow-y-auto border-r border-border">
              <div>
                <h3 className="text-sm font-semibold mb-2">Mô tả</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{task.description || 'Chưa có mô tả chi tiết cho công việc này.'}</p>
              </div>

              {subtasksTotal > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Công việc phụ</h3>
                    <span className="text-xs text-muted-foreground">{subtasksDone}/{subtasksTotal}</span>
                  </div>
                  <div className="w-full bg-accent rounded-full h-1.5 mb-3">
                    <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${(subtasksDone/subtasksTotal)*100}%` }} />
                  </div>
                  <div className="space-y-2">
                    {(task.subtasks || []).map((st: Subtask) => (
                      <label key={st.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer">
                        <Checkbox checked={!!st.done} onCheckedChange={() => handleSubtaskToggle(st.id)} />
                        <span className={cn("text-sm", st.done && "line-through text-muted-foreground")}>{st.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold mb-3">Bình luận</h3>
                <div className="space-y-4 mb-4">
                  {comments.map((c: TaskComment) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={c.author_avatar} />
                        <AvatarFallback className="text-[10px]">{c.author_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium">{c.author_name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {c.created_date ? format(new Date(c.created_date), 'dd/MM HH:mm') : ''}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Viết phản hồi..."
                    rows={2}
                    className="text-sm resize-none"
                  />
                  <Button size="icon" onClick={handleComment} disabled={commentMutation.isPending || !commentText.trim()} className="self-end">
                    {commentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Settings */}
            <div className="sm:col-span-2 p-5 space-y-5 bg-accent/20 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Trạng thái</label>
                <Select value={fields.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_CONFIG) as [TaskStatus, any][]).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                          <span className="text-sm">{cfg.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Độ ưu tiên</label>
                <Select value={fields.priority} onValueChange={(v: Priority) => setField('priority', v)}>
                  <SelectTrigger className="h-9 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Thấp</SelectItem>
                    <SelectItem value="medium">Trung bình</SelectItem>
                    <SelectItem value="high">Cao</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Người thực hiện</label>
                <Select value={fields.assignee_id || 'none'} onValueChange={v => setField('assignee_id', v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-9 bg-card">
                    <SelectValue placeholder="Chưa phân công" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Bỏ phân công</SelectItem>
                    {users.map((u: User) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignee && (
                   <div className="flex items-center gap-2 mt-2 px-1">
                      <Avatar className="h-5 w-5"><AvatarImage src={assignee.avatar} /><AvatarFallback className="text-[8px]">{assignee.full_name[0]}</AvatarFallback></Avatar>
                      <span className="text-xs text-muted-foreground">{assignee.full_name}</span>
                   </div>
                )}
              </div>

              <div className="pt-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Thời gian thực hiện</label>
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground mb-1 block">Ngày bắt đầu</span>
                    <Input type="date" value={fields.start_date} onChange={e => setField('start_date', e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground mb-1 block">Hạn chót</span>
                    <Input type="date" value={fields.due_date} onChange={e => setField('due_date', e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              </div>

              {dirty && (
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full gap-2 mt-4 shadow-sm">
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu thay đổi
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}