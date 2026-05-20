import { useMemo } from 'react'; // Bỏ React import thừa
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Paperclip, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
// Import chuẩn từ file index.ts đã tạo
import { type Task, type User, type Priority } from '@/types';

// --- 1. Định nghĩa Interface cho Props ---
interface TaskCardProps {
  task: Task;
  users?: User[]; // Dấu ? để phòng trường hợp không truyền users
  onClick?: (task: Task) => void;
  isDragging?: boolean;
}

// --- 2. Cấu hình Priority cục bộ (Fix lỗi import .js) ---
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low: { label: 'Thấp', color: 'text-slate-600', bg: 'bg-slate-100' },
  medium: { label: 'Trung bình', color: 'text-amber-600', bg: 'bg-amber-100' },
  high: { label: 'Cao', color: 'text-rose-600', bg: 'bg-rose-100' },
  urgent: { label: 'Khan cap', color: 'text-red-700', bg: 'bg-red-100' },
};

export default function TaskCard({ task, users = [], onClick, isDragging }: TaskCardProps) {
  // Fix lỗi "id does not exist on type never" bằng cách ép kiểu users ở trên
  const userMap = useMemo(() => 
    Object.fromEntries(users.map((u: User) => [u.id, u])), 
  [users]);

  const assignee = task.assignee_id ? userMap[task.assignee_id] : null;
  const priority = PRIORITY_CONFIG[task.priority as Priority] || PRIORITY_CONFIG.medium;
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((subtask) => subtask.done || subtask.is_completed).length;
  const subtaskPercent = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;
  
  const isOverdue = useMemo(() => {
    if (!task.due_date || task.status === 'done') return false;
    return new Date(task.due_date) < new Date();
  }, [task.due_date, task.status]);

  return (
    <div
      onClick={() => onClick?.(task)}
      className={cn(
        "bg-card rounded-lg border border-border p-3.5 cursor-pointer transition-all duration-200 group",
        "hover:shadow-md hover:border-primary/20",
        isDragging && "shadow-lg border-primary/30 rotate-1 scale-105 opacity-90"
      )}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className={cn(
          "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", 
          priority.bg, 
          priority.color
        )}>
          <Flag className="w-3 h-3" />
          {priority.label}
        </span>
        {(task.attachment_count || 0) > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
            <Paperclip className="w-3 h-3" />
            {task.attachment_count}
          </span>
        )}
      </div>

      <h4 className="text-sm font-semibold text-foreground mb-3 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {task.title}
      </h4>

      {subtasks.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{completedSubtasks}/{subtasks.length} hoan thanh</span>
            <span>{subtaskPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${subtaskPercent}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          {assignee ? (
            <Avatar className="h-6 w-6 border border-background shadow-sm">
              <AvatarImage src={assignee.avatar} />
              <AvatarFallback className="text-[9px] font-bold">
                {assignee.full_name?.[0] || assignee.email[0]}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center border border-dashed border-muted-foreground/30">
              <span className="text-[9px] text-muted-foreground font-bold">?</span>
            </div>
          )}
        </div>
        
        {task.due_date && (
          <span className={cn(
            "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded", 
            isOverdue ? "bg-destructive/10 text-destructive" : "text-muted-foreground"
          )}>
            <Calendar className="w-3 h-3" />
            {format(new Date(task.due_date), 'dd/MM')}
          </span>
        )}
      </div>
    </div>
  );
}
