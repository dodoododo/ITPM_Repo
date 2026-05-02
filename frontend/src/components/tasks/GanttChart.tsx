import { useState, useMemo, useRef, useCallback, type MouseEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// Import chuẩn từ file index.ts đã thống nhất
import { type Task, type User, type DraggingState, type TaskStatus } from '@/types';
import TaskDetailPanel from './TaskDetailPanel.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  differenceInDays, 
  addDays, 
  startOfWeek, 
  eachWeekOfInterval, 
  format 
} from 'date-fns';
import { cn } from '@/lib/utils';

// Cấu hình màu sắc dựa trên TaskStatus
const STATUS_BAR_COLORS: Record<TaskStatus, string> = {
  todo: '#94a3b8',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  done: '#10b981',
};

interface GanttChartProps {
  projectId: string;
  tasks: Task[];
  users: User[];
}

export default function GanttChart({ projectId, tasks = [], users = [] }: GanttChartProps) {
  const qc = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const userMap = useMemo(() => 
    Object.fromEntries(users.map(u => [u.id, u])), 
  [users]);

  // Giả lập Mutation cập nhật ngày tháng
  const updateMutation = useMutation({
    mutationFn: async ({ id, start_date, due_date }: { id: string; start_date: string; due_date: string }) => {
      console.log(`Cập nhật Task ${id}:`, { start_date, due_date });
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id, start_date, due_date };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Tính toán timeline (hiển thị khoảng 90 ngày hoặc bao quát toàn bộ task)
  const { timelineStart, totalDays, weeks } = useMemo(() => {
    const dates = tasks
      .flatMap(t => [t.start_date, t.due_date].filter(Boolean))
      .map(d => new Date(d as string));

    if (!dates.length) {
      const start = addDays(new Date(), -14);
      return { 
        timelineStart: start, 
        totalDays: 90, 
        weeks: eachWeekOfInterval({ start, end: addDays(start, 90) }) 
      };
    }

    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const start = addDays(startOfWeek(min), -7);
    const end = addDays(max, 14);
    const total = differenceInDays(end, start);

    return { timelineStart: start, totalDays: total, weeks: eachWeekOfInterval({ start, end }) };
  }, [tasks]);

  const getTimelineWidth = () => {
    const el = containerRef.current?.querySelector('[data-timeline]');
    return el?.getBoundingClientRect().width || 600;
  };

  // Logic Kéo thả
  const handleDragStart = useCallback((e: MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!task.start_date || !task.due_date) return;
    setDragging({
      taskId: task.id,
      startX: e.clientX,
      origStartDate: task.start_date,
      origDueDate: task.due_date,
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const timelineWidth = getTimelineWidth();
    const deltaX = e.clientX - dragging.startX;
    const deltaDays = Math.round((deltaX / timelineWidth) * totalDays);

    setDragging(prev => prev ? ({ ...prev, deltaDays }) : null);
  }, [dragging, totalDays]);

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;
    const deltaDays = dragging.deltaDays || 0;
    if (deltaDays !== 0) {
      const newStart = format(addDays(new Date(dragging.origStartDate), deltaDays), 'yyyy-MM-dd');
      const newDue = format(addDays(new Date(dragging.origDueDate), deltaDays), 'yyyy-MM-dd');
      updateMutation.mutate({ id: dragging.taskId, start_date: newStart, due_date: newDue });
    }
    setDragging(null);
  }, [dragging, updateMutation]);

  // Tính toán vị trí thanh Bar (kể cả khi đang kéo)
  const getDisplayBar = (task: Task) => {
    let startStr = task.start_date;
    let dueStr = task.due_date;

    if (dragging && dragging.taskId === task.id && dragging.deltaDays) {
      startStr = format(addDays(new Date(dragging.origStartDate), dragging.deltaDays), 'yyyy-MM-dd');
      dueStr = format(addDays(new Date(dragging.origDueDate), dragging.deltaDays), 'yyyy-MM-dd');
    }

    if (!startStr || !dueStr) return null;

    const left = (differenceInDays(new Date(startStr), timelineStart) / totalDays) * 100;
    const width = (differenceInDays(new Date(dueStr), new Date(startStr)) / totalDays) * 100;

    return { left: Math.max(0, left), width: Math.max(0.5, width), start: startStr, due: dueStr };
  };

  return (
    <>
      <div
        className="bg-card rounded-lg border border-border overflow-hidden select-none"
        onMouseMove={(e) => handleMouseMove(e as unknown as MouseEvent)}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={containerRef}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Timeline Header */}
            <div className="flex border-b border-border bg-accent/40">
              <div className="w-56 flex-shrink-0 px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase border-r border-border">
                Danh sách công việc
              </div>
              <div className="flex-1 flex" data-timeline>
                {weeks.map((week, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground py-2.5 text-center border-r border-border last:border-0"
                    style={{ width: `${(7 / totalDays) * 100}%`, minWidth: 40 }}>
                    {format(week, 'dd/MM')}
                  </div>
                ))}
              </div>
            </div>

            {/* Task Rows */}
            {tasks.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">Dự án này chưa có công việc.</div>
            )}

            {tasks.map(task => {
              const assignee = userMap[task.assignee_id || ''] as User | undefined;
              const bar = getDisplayBar(task);
              const barColor = STATUS_BAR_COLORS[task.status] || '#94a3b8';
              const isDraggingThis = dragging?.taskId === task.id;

              return (
                <div key={task.id} className="flex border-b border-border last:border-0 hover:bg-accent/10 transition-colors group">
                  <div
                    className="w-56 flex-shrink-0 px-4 py-3 border-r border-border cursor-pointer overflow-hidden"
                    onClick={() => !isDraggingThis && setSelectedTask(task)}
                  >
                    <div className="flex items-center gap-2">
                      {assignee && (
                        <Avatar className="h-5 w-5 flex-shrink-0">
                          <AvatarImage src={assignee.avatar} />
                          <AvatarFallback className="text-[8px]">{assignee.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 relative py-3 px-1" data-timeline>
                    {bar ? (
                      <div
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 h-7 rounded flex items-center px-2 transition-shadow",
                          isDraggingThis ? "shadow-xl ring-2 ring-primary/20 z-10 cursor-grabbing" : "cursor-grab hover:brightness-105"
                        )}
                        style={{ left: `${bar.left}%`, width: `${bar.width}%`, backgroundColor: barColor }}
                        onMouseDown={(e) => handleDragStart(e, task)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[9px] font-bold text-white whitespace-nowrap truncate">{task.title}</span>
                      </div>
                    ) : (
                      <div className="absolute top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground px-2 italic cursor-pointer"
                        onClick={() => setSelectedTask(task)}>
                        Chưa thiết lập ngày
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          projectId={projectId}
          users={users}
          onUpdate={(updatedTask: Task) => {
            setSelectedTask(updatedTask);
            qc.invalidateQueries({ queryKey: ['tasks', projectId] });
          }}
        />
      )}
    </>
  );
}