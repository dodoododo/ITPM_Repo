import { useState, useMemo } from 'react';
// Import type chuẩn từ file index.ts
import { type Task, type User, type TaskStatus, type Priority } from '@/types';
import TaskDetailPanel from './TaskDetailPanel.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// --- 1. Định nghĩa Interface cho Props ---
interface ListViewProps {
  projectId: string;
  tasks: Task[];
  users: User[];
}

// --- 2. Cấu hình hiển thị (Fix lỗi import .js) ---
const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string; color: string }> = {
  todo: { label: 'Cần làm', dot: 'bg-slate-400', color: 'text-slate-600 bg-slate-100' },
  in_progress: { label: 'Đang làm', dot: 'bg-blue-500', color: 'text-blue-600 bg-blue-100' },
  review: { label: 'Chờ duyệt', dot: 'bg-amber-500', color: 'text-amber-600 bg-amber-100' },
  done: { label: 'Hoàn thành', dot: 'bg-emerald-500', color: 'text-emerald-600 bg-emerald-100' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low: { label: 'Thấp', color: 'text-slate-500' },
  medium: { label: 'Trung bình', color: 'text-amber-600' },
  high: { label: 'Cao', color: 'text-rose-600' },
  urgent: { label: 'Khan cap', color: 'text-red-700' },
};

export default function ListView({ projectId, tasks = [], users = [] }: ListViewProps) {
  // Fix lỗi "never": Khai báo kiểu dữ liệu cho state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const userMap = useMemo(() => 
    Object.fromEntries(users.map((u: User) => [u.id, u])), 
  [users]);

  return (
    <>
      <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-accent/40">
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-3">Công việc</th>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-3">Người làm</th>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-3">Trạng thái</th>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-3">Ưu tiên</th>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-3">Hạn chót</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-sm text-muted-foreground italic">
                    Chưa có công việc nào trong dự án này.
                  </td>
                </tr>
              )}
              
              {tasks.map((task: Task) => {
                const assignee = task.assignee_id ? userMap[task.assignee_id] : null;
                const status = STATUS_CONFIG[task.status];
                const priority = PRIORITY_CONFIG[task.priority];
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                
                return (
                  <tr 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className="border-b border-border last:border-0 hover:bg-accent/20 cursor-pointer transition-all group"
                  >
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {task.title}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={assignee.avatar} />
                            <AvatarFallback className="text-[8px]">
                              {assignee.full_name?.[0] || assignee.email[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{assignee.full_name || assignee.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">Chưa phân công</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="secondary" className={cn("text-[10px] font-bold px-2 py-0.5", status?.color)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", status?.dot)} />
                        {status?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-xs font-bold uppercase tracking-tight", priority?.color)}>
                        {priority?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {task.due_date ? (
                        <span className={cn(
                          "text-xs font-medium", 
                          isOverdue ? "text-destructive font-bold" : "text-muted-foreground"
                        )}>
                          {format(new Date(task.due_date), 'dd/MM/yyyy')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/30">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel sử dụng chung Task và User từ types */}
      {selectedTask && (
        <TaskDetailPanel 
          task={selectedTask} 
          open={!!selectedTask} 
          onClose={() => setSelectedTask(null)} 
          projectId={projectId} 
          users={users} 
          onUpdate={(updatedTask: Task) => setSelectedTask(updatedTask)} 
        />
      )}
    </>
  );
}
