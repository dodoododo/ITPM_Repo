import { useMemo, useRef, useState, type MouseEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addDays,
  differenceInDays,
  eachDayOfInterval,
  format,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { taskService } from '@/services/taskService';
import { cn } from '@/lib/utils';
import TaskDetailPanel from './TaskDetailPanel.tsx';
import { type Task, type TaskStatus, type User } from '@/types';

const LEFT_WIDTH = 560;
const DAY_WIDTH = 34;
const GROUP_HEIGHT = 42;
const TASK_HEIGHT = 48;

const STATUS_CONFIG: Record<TaskStatus, { label: string; badge: string; bar: string }> = {
  todo: { label: 'TODO', badge: 'bg-slate-100 text-slate-600 border-slate-200', bar: '#94a3b8' },
  in_progress: { label: 'DOING', badge: 'bg-blue-50 text-blue-700 border-blue-200', bar: '#3b82f6' },
  review: { label: 'REVIEW', badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: '#f59e0b' },
  needs_revision: { label: 'REVISION', badge: 'bg-red-50 text-red-700 border-red-200', bar: '#ef4444' },
  done: { label: 'DONE', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: '#10b981' },
};

const GROUP_CONFIG: Array<{ id: TaskStatus; label: string }> = [
  { id: 'todo', label: '01. Lap ke hoach / Can lam' },
  { id: 'in_progress', label: '02. Dang trien khai' },
  { id: 'review', label: '03. Cho nghiem thu' },
  { id: 'needs_revision', label: '04. Can sua lai' },
  { id: 'done', label: '05. Cong viec da hoan thanh' },
];

interface DragState {
  taskId: string;
  mode: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  originalStartDate: string;
  originalDueDate: string;
  previewStartDate: string;
  previewDueDate: string;
}

interface GanttChartProps {
  projectId: string;
  tasks: Task[];
  users: User[];
  onTaskUpdated?: (task: Task) => void;
}

type GanttRow =
  | { type: 'group'; id: TaskStatus; label: string; count: number }
  | { type: 'task'; id: string; groupId: TaskStatus; task: Task };

const getEntityId = (value?: string | { _id?: string; id?: string }) => (
  typeof value === 'string' ? value : value?._id || value?.id || ''
);

const getUserId = (user: User) => getEntityId(user);

const toDateLabel = (value?: string) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return format(date, 'dd/MM');
};

const getDependencyIds = (task: Task) => {
  const values = task.dependency_ids?.length ? task.dependency_ids : task.dependencies || [];
  return values.map(getEntityId).filter(Boolean);
};

const getBarColor = (task: Task) => {
  if (task.status !== 'done' && task.due_date && new Date(task.due_date) < new Date()) {
    return '#ef4444';
  }
  if (task.priority === 'urgent' || task.priority === 'high') {
    return '#f59e0b';
  }
  return STATUS_CONFIG[task.status]?.bar || '#94a3b8';
};

export default function GanttChart({ projectId, tasks = [], users = [], onTaskUpdated }: GanttChartProps) {
  const qc = useQueryClient();
  const { token, user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [error, setError] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<TaskStatus>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const canEditSchedule = user?.role === 'admin' || user?.role === 'manager';

  const userMap = useMemo(
    () => Object.fromEntries(users.map((item) => [getUserId(item), item])),
    [users]
  );

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ taskId, startDate, dueDate }: { taskId: string; startDate: string; dueDate: string }) => {
      if (!token) throw new Error('Missing auth token');
      return taskService.updateTask(taskId, { start_date: startDate, due_date: dueDate }, token);
    },
    onSuccess: (response) => {
      if (response.data) {
        const updatedTask = response.data;
        setSelectedTask((current) => (current?.id === updatedTask.id ? updatedTask : current));
        onTaskUpdated?.(updatedTask);
      }
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setError('');
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to update task schedule');
    },
  });

  const { timelineStart, timelineEnd, days, monthSpans, timelineWidth } = useMemo(() => {
    const taskDates = tasks
      .flatMap((task) => [task.start_date, task.due_date, task.actualFinishDate].filter(Boolean))
      .map((date) => new Date(date as string))
      .filter((date) => !Number.isNaN(date.getTime()));

    const today = startOfDay(new Date());
    const min = taskDates.length ? new Date(Math.min(...taskDates.map((date) => date.getTime()))) : addDays(today, -7);
    const max = taskDates.length ? new Date(Math.max(...taskDates.map((date) => date.getTime()))) : addDays(today, 45);
    const start = startOfDay(addDays(startOfMonth(min), -3));
    const end = startOfDay(addDays(max, 21));
    const dayList = eachDayOfInterval({ start, end });

    const spans: Array<{ key: string; label: string; width: number }> = [];
    dayList.forEach((day) => {
      const key = format(day, 'yyyy-MM');
      const last = spans[spans.length - 1];
      if (last?.key === key) {
        last.width += DAY_WIDTH;
      } else {
        spans.push({ key, label: format(day, 'MMM yyyy'), width: DAY_WIDTH });
      }
    });

    return {
      timelineStart: start,
      timelineEnd: end,
      days: dayList,
      monthSpans: spans,
      timelineWidth: dayList.length * DAY_WIDTH,
    };
  }, [tasks]);

  const groups = useMemo(() => (
    GROUP_CONFIG.map((group) => ({
      ...group,
      tasks: tasks.filter((task) => task.status === group.id),
    }))
  ), [tasks]);

  const rows = useMemo<GanttRow[]>(() => (
    groups.flatMap((group) => {
      const groupRow: GanttRow = { type: 'group', id: group.id, label: group.label, count: group.tasks.length };
      if (collapsedGroups.has(group.id)) return [groupRow];
      return [
        groupRow,
        ...group.tasks.map((task) => ({
          type: 'task' as const,
          id: task.id,
          groupId: group.id,
          task,
        })),
      ];
    })
  ), [groups, collapsedGroups]);

  const rowOffsets = useMemo(() => {
    let offset = 0;
    return rows.map((row) => {
      const top = offset;
      offset += row.type === 'group' ? GROUP_HEIGHT : TASK_HEIGHT;
      return top;
    });
  }, [rows]);

  const totalRowsHeight = rows.reduce((sum, row) => sum + (row.type === 'group' ? GROUP_HEIGHT : TASK_HEIGHT), 0);

  const taskRowIndex = useMemo(() => {
    const entries = rows.flatMap((row, index) => (row.type === 'task' ? [[row.task.id, index] as const] : []));
    return new Map(entries);
  }, [rows]);

  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const getPreviewStartDate = (task: Task) => (
    dragging?.taskId === task.id ? dragging.previewStartDate : task.start_date
  );

  const getPreviewDueDate = (task: Task) => (
    dragging?.taskId === task.id ? dragging.previewDueDate : task.due_date
  );

  const getDisplayBar = (task: Task) => {
    const startValue = getPreviewStartDate(task) || task.createdAt;
    const dueValue = getPreviewDueDate(task) || task.due_date || task.start_date;
    if (!startValue || !dueValue) return null;

    const start = startOfDay(new Date(startValue));
    const due = startOfDay(new Date(dueValue));
    if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) return null;

    const left = Math.max(0, differenceInDays(start, timelineStart) * DAY_WIDTH);
    const durationDays = Math.max(1, differenceInDays(due, start) + 1);
    const width = Math.max(72, durationDays * DAY_WIDTH);

    return {
      left,
      width,
      due: format(due, 'yyyy-MM-dd'),
      startLabel: format(start, 'dd'),
      dueLabel: format(due, 'dd/MM'),
    };
  };

  const dependencyLines = useMemo(() => (
    rows.flatMap((row, rowIndex) => {
      if (row.type !== 'task') return [];
      const currentBar = getDisplayBar(row.task);
      if (!currentBar) return [];

      return getDependencyIds(row.task).flatMap((dependencyId) => {
        const dependencyTask = taskMap.get(dependencyId);
        const dependencyRowIndex = dependencyTask ? taskRowIndex.get(dependencyTask.id) : undefined;
        if (!dependencyTask || dependencyRowIndex === undefined) return [];

        const dependencyBar = getDisplayBar(dependencyTask);
        if (!dependencyBar) return [];

        const startX = dependencyBar.left + dependencyBar.width;
        const startY = rowOffsets[dependencyRowIndex] + TASK_HEIGHT / 2;
        const endX = currentBar.left;
        const endY = rowOffsets[rowIndex] + TASK_HEIGHT / 2;
        return [{
          id: `${dependencyTask.id}-${row.task.id}`,
          path: `M ${startX} ${startY} C ${startX + 24} ${startY}, ${Math.max(endX - 24, startX + 8)} ${endY}, ${endX} ${endY}`,
        }];
      });
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [rows, rowOffsets, taskMap, taskRowIndex, dragging, timelineStart]);

  const todayOffset = (() => {
    const today = startOfDay(new Date());
    if (today < timelineStart || today > timelineEnd) return null;
    return differenceInDays(today, timelineStart) * DAY_WIDTH;
  })();

  const getDependencyWarning = (task: Task) => {
    const previewStart = getPreviewStartDate(task);
    if (!previewStart) return '';
    const startDate = startOfDay(new Date(previewStart));
    const blockingDependency = getDependencyIds(task)
      .map((dependencyId) => taskMap.get(dependencyId))
      .find((dependency) => {
        if (!dependency?.due_date) return false;
        return startOfDay(new Date(dependency.due_date)) > startDate;
      });
    return blockingDependency ? `Canh bao: ${blockingDependency.title} ket thuc sau ngay bat dau moi` : '';
  };

  const toggleGroup = (status: TaskStatus) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const handleDragStart = (event: MouseEvent, task: Task, mode: DragState['mode']) => {
    event.stopPropagation();
    if (!canEditSchedule || !task.start_date || !task.due_date) return;

    setDragging({
      taskId: task.id,
      mode,
      startX: event.clientX,
      originalStartDate: task.start_date,
      originalDueDate: task.due_date,
      previewStartDate: task.start_date,
      previewDueDate: task.due_date,
    });
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!dragging) return;

    const task = tasks.find((item) => item.id === dragging.taskId);
    if (!task) return;

    const deltaDays = Math.round((event.clientX - dragging.startX) / DAY_WIDTH);
    const originalStart = startOfDay(new Date(dragging.originalStartDate));
    const originalDue = startOfDay(new Date(dragging.originalDueDate));
    const durationDays = Math.max(0, differenceInDays(originalDue, originalStart));

    let nextStart = originalStart;
    let nextDue = originalDue;

    if (dragging.mode === 'move') {
      nextStart = addDays(originalStart, deltaDays);
      nextDue = addDays(originalDue, deltaDays);
    } else if (dragging.mode === 'resize-start') {
      const proposedStart = addDays(originalStart, deltaDays);
      nextStart = proposedStart > originalDue ? originalDue : proposedStart;
      nextDue = originalDue;
    } else {
      const proposedDue = addDays(originalDue, deltaDays);
      const minDue = addDays(originalStart, 0);
      nextDue = proposedDue < minDue ? minDue : proposedDue;
      nextStart = originalStart;
    }

    if (dragging.mode === 'move') {
      nextDue = addDays(nextStart, durationDays);
    }

    setDragging((current) => current
      ? {
        ...current,
        previewStartDate: format(nextStart, 'yyyy-MM-dd'),
        previewDueDate: format(nextDue, 'yyyy-MM-dd'),
      }
      : null);
  };

  const handleMouseUp = () => {
    if (!dragging) return;

    const changed = dragging.previewDueDate !== dragging.originalDueDate || dragging.previewStartDate !== dragging.originalStartDate;
    const taskId = dragging.taskId;
    const startDate = dragging.previewStartDate;
    const dueDate = dragging.previewDueDate;
    setDragging(null);

    if (changed) updateScheduleMutation.mutate({ taskId, startDate, dueDate });
  };

  return (
    <>
      <div
        ref={containerRef}
        className="h-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-[13px] font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="h-full overflow-auto">
          <div className="min-w-full" style={{ width: LEFT_WIDTH + timelineWidth }}>
            <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-white">
              <div className="sticky left-0 z-40 grid shrink-0 grid-cols-[minmax(0,1fr)_72px_72px_82px_76px] border-r border-slate-200 bg-slate-50" style={{ width: LEFT_WIDTH }}>
                {['Ten cong viec', 'Bat dau', 'Deadline', 'Hoan thanh', 'Trang thai'].map((label) => (
                  <div key={label} className="flex h-[62px] items-end border-r border-slate-200 px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 last:border-r-0">
                    {label}
                  </div>
                ))}
              </div>

              <div className="shrink-0 bg-white" style={{ width: timelineWidth }}>
                <div className="flex h-8 border-b border-slate-200">
                  {monthSpans.map((month) => (
                    <div
                      key={month.key}
                      className="flex items-center justify-center border-r border-slate-200 text-[11px] font-extrabold uppercase text-slate-600"
                      style={{ width: month.width }}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>
                <div className="flex h-[30px]">
                  {days.map((day) => (
                    <div
                      key={day.toISOString()}
                      className="flex items-center justify-center border-r border-slate-100 text-[10px] font-semibold text-slate-400"
                      style={{ width: DAY_WIDTH }}
                    >
                      {format(day, 'dd')}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-[13px] font-medium text-slate-500">
                Du an nay chua co cong viec.
              </div>
            ) : (
              <div className="relative flex">
                <div className="sticky left-0 z-20 shrink-0 border-r border-slate-200 bg-white" style={{ width: LEFT_WIDTH }}>
                  {rows.map((row) => {
                    const height = row.type === 'group' ? GROUP_HEIGHT : TASK_HEIGHT;

                    if (row.type === 'group') {
                      const collapsed = collapsedGroups.has(row.id);
                      return (
                        <button
                          key={`left-${row.id}`}
                          type="button"
                          onClick={() => toggleGroup(row.id)}
                          className="grid w-full grid-cols-[minmax(0,1fr)_72px_72px_82px_76px] border-b border-slate-200 bg-slate-50 text-left"
                          style={{ height }}
                        >
                          <div className="flex items-center gap-2 border-r border-slate-200 px-3">
                            {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
                            <span className="truncate text-[12px] font-extrabold text-slate-800">{row.label}</span>
                            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{row.count}</span>
                          </div>
                          <div className="border-r border-slate-200" />
                          <div className="border-r border-slate-200" />
                          <div className="border-r border-slate-200" />
                          <div />
                        </button>
                      );
                    }

                    const task = row.task;
                    const assignee = task.assignee || (task.assignee_id ? userMap[getEntityId(task.assignee_id)] : undefined);
                    const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;

                    return (
                      <div
                        key={`left-${task.id}`}
                        className="grid grid-cols-[minmax(0,1fr)_72px_72px_82px_76px] border-b border-slate-100 bg-white text-[11px] text-slate-600 transition hover:bg-emerald-50/30"
                        style={{ height }}
                      >
                        <button type="button" onClick={() => setSelectedTask(task)} className="flex min-w-0 items-center gap-2 border-r border-slate-100 px-3 text-left">
                          <Checkbox checked={task.status === 'done'} className="h-3.5 w-3.5" />
                          <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{task.title}</span>
                          {assignee && (
                            <Avatar className="h-5 w-5 border border-white">
                              <AvatarImage src={assignee.avatar} />
                              <AvatarFallback className="bg-slate-100 text-[8px] font-bold text-slate-600">
                                {assignee.full_name?.[0] || assignee.email?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </button>
                        <div className="flex items-center border-r border-slate-100 px-2 font-medium">{toDateLabel(task.start_date)}</div>
                        <div className="flex items-center border-r border-slate-100 px-2 font-medium">{toDateLabel(task.due_date)}</div>
                        <div className="flex items-center border-r border-slate-100 px-2 font-medium">{toDateLabel(task.actualFinishDate)}</div>
                        <div className="flex items-center px-2">
                          <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-extrabold', status.badge)}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="relative shrink-0" style={{ width: timelineWidth, height: totalRowsHeight }}>
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `linear-gradient(to right, rgba(226,232,240,0.78) 1px, transparent 1px)`,
                      backgroundSize: `${DAY_WIDTH}px 100%`,
                    }}
                  />

                  {todayOffset !== null && (
                    <div className="absolute top-0 z-20 h-full w-px bg-emerald-500" style={{ left: todayOffset }}>
                      <span className="absolute -top-6 left-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Today</span>
                    </div>
                  )}

                  <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
                    {dependencyLines.map((line) => (
                      <path key={line.id} d={line.path} fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="4 4" />
                    ))}
                  </svg>

                  {rows.map((row, index) => {
                    const height = row.type === 'group' ? GROUP_HEIGHT : TASK_HEIGHT;
                    const top = rowOffsets[index];

                    if (row.type === 'group') {
                      return (
                        <div
                          key={`timeline-${row.id}`}
                          className="absolute left-0 w-full border-b border-slate-200 bg-slate-50/80"
                          style={{ top, height }}
                        />
                      );
                    }

                    const task = row.task;
                    const bar = getDisplayBar(task);
                    const assignee = task.assignee || (task.assignee_id ? userMap[getEntityId(task.assignee_id)] : undefined);
                    const isDraggingThis = dragging?.taskId === task.id;
                    const dependencyWarning = isDraggingThis ? getDependencyWarning(task) : '';

                    return (
                      <div
                        key={`timeline-${task.id}`}
                        className="absolute left-0 w-full border-b border-slate-100"
                        style={{ top, height }}
                      >
                        {bar ? (
                          <button
                            type="button"
                            onClick={() => !isDraggingThis && setSelectedTask(task)}
                            className={cn(
                              'absolute top-1/2 z-20 flex h-7 -translate-y-1/2 cursor-grab items-center rounded px-2 text-left text-white shadow-sm transition hover:brightness-105 active:cursor-grabbing',
                              isDraggingThis && 'ring-2 ring-emerald-200'
                            )}
                            style={{ left: bar.left, width: bar.width, backgroundColor: getBarColor(task) }}
                            onMouseDown={(event) => handleDragStart(event, task, 'move')}
                          >
                            <span className="truncate text-[10px] font-extrabold">
                              [{bar.startLabel}-{bar.dueLabel}] {task.title}
                            </span>
                            {assignee && (
                              <Avatar className="ml-auto h-5 w-5 shrink-0 border border-white/60">
                                <AvatarImage src={assignee.avatar} />
                                <AvatarFallback className="bg-white/20 text-[8px] font-bold text-white">
                                  {assignee.full_name?.[0] || assignee.email?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            {canEditSchedule && (
                              <span
                                role="button"
                                tabIndex={0}
                                aria-label="Resize start date"
                                className="absolute -left-2 top-0 flex h-7 w-4 cursor-ew-resize items-center justify-center rounded bg-black/20 hover:bg-black/35"
                                onMouseDown={(event) => handleDragStart(event, task, 'resize-start')}
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </span>
                            )}
                            {canEditSchedule && (
                              <span
                                role="button"
                                tabIndex={0}
                                aria-label="Resize deadline"
                                className="absolute -right-2 top-0 flex h-7 w-4 cursor-ew-resize items-center justify-center rounded bg-black/20 hover:bg-black/35"
                                onMouseDown={(event) => handleDragStart(event, task, 'resize-end')}
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </span>
                            )}
                            {isDraggingThis && (
                              <span className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow">
                                {dragging.previewStartDate} - {dragging.previewDueDate}
                                {dependencyWarning && <span className="block text-amber-200">{dependencyWarning}</span>}
                              </span>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="absolute top-1/2 -translate-y-1/2 rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold italic text-slate-500"
                            onClick={() => setSelectedTask(task)}
                          >
                            Chua thiet lap ngay
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          projectId={projectId}
          users={users}
          onUpdate={(updatedTask: Task) => {
            setSelectedTask(updatedTask);
            onTaskUpdated?.(updatedTask);
          }}
        />
      )}
    </>
  );
}
