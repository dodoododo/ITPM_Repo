import { useMemo, useState } from 'react';
import { addDays, format, isBefore, isToday, startOfDay } from 'date-fns';
import { ArrowUpDown } from 'lucide-react';
import { type Priority, type Task, type TaskStatus, type User } from '@/types';
import TaskDetailPanel from './TaskDetailPanel.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ListViewProps {
  projectId: string;
  tasks: Task[];
  users: User[];
  onTaskUpdated?: (task: Task) => void;
}

type SortKey = 'title' | 'assignee' | 'status' | 'priority' | 'due_date';
type SortDirection = 'asc' | 'desc';
type DueDateFilter = 'all' | 'overdue' | 'today' | 'next_7_days' | 'no_due_date';

const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string; color: string; rank: number }> = {
  todo: { label: 'Todo', dot: 'bg-slate-400', color: 'text-slate-600 bg-slate-100', rank: 1 },
  in_progress: { label: 'In Progress', dot: 'bg-blue-500', color: 'text-blue-600 bg-blue-100', rank: 2 },
  review: { label: 'Pending Review', dot: 'bg-amber-500', color: 'text-amber-600 bg-amber-100', rank: 3 },
  needs_revision: { label: 'Needs Revision', dot: 'bg-red-500', color: 'text-red-600 bg-red-100', rank: 4 },
  done: { label: 'Done', dot: 'bg-emerald-500', color: 'text-emerald-600 bg-emerald-100', rank: 5 },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; rank: number }> = {
  low: { label: 'Low', color: 'text-slate-500', rank: 1 },
  medium: { label: 'Medium', color: 'text-amber-600', rank: 2 },
  high: { label: 'High', color: 'text-rose-600', rank: 3 },
  urgent: { label: 'Urgent', color: 'text-red-700', rank: 4 },
};

const getUserId = (user: User) => user._id || user.id || '';

const compareValues = (left: string | number, right: string | number, direction: SortDirection) => {
  if (left === right) return 0;
  const result = left > right ? 1 : -1;
  return direction === 'asc' ? result : -result;
};

const matchesDueDateFilter = (task: Task, filter: DueDateFilter) => {
  if (filter === 'all') return true;
  if (!task.due_date) return filter === 'no_due_date';

  const dueDate = startOfDay(new Date(task.due_date));
  const today = startOfDay(new Date());

  if (filter === 'overdue') return task.status !== 'done' && isBefore(dueDate, today);
  if (filter === 'today') return isToday(dueDate);
  if (filter === 'next_7_days') {
    return !isBefore(dueDate, today) && !isBefore(addDays(today, 7), dueDate);
  }

  return true;
};

export default function ListView({ projectId, tasks = [], users = [], onTaskUpdated }: ListViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const userMap = useMemo(
    () => Object.fromEntries(users.map((user) => [getUserId(user), user])),
    [users]
  );

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return tasks
      .filter((task) => {
        const assigneeMatch = assigneeFilter === 'all' || task.assignee_id === assigneeFilter;
        const statusMatch = statusFilter === 'all' || task.status === statusFilter;
        const dueDateMatch = matchesDueDateFilter(task, dueDateFilter);
        const searchMatch = !keyword || task.title.toLowerCase().includes(keyword);
        return assigneeMatch && statusMatch && dueDateMatch && searchMatch;
      })
      .sort((left, right) => {
        if (sortKey === 'title') return compareValues(left.title.toLowerCase(), right.title.toLowerCase(), sortDirection);
        if (sortKey === 'assignee') {
          const leftName = left.assignee_id ? userMap[left.assignee_id]?.full_name || '' : '';
          const rightName = right.assignee_id ? userMap[right.assignee_id]?.full_name || '' : '';
          return compareValues(leftName.toLowerCase(), rightName.toLowerCase(), sortDirection);
        }
        if (sortKey === 'status') {
          return compareValues(STATUS_CONFIG[left.status]?.rank || 0, STATUS_CONFIG[right.status]?.rank || 0, sortDirection);
        }
        if (sortKey === 'priority') {
          return compareValues(PRIORITY_CONFIG[left.priority]?.rank || 0, PRIORITY_CONFIG[right.priority]?.rank || 0, sortDirection);
        }

        const leftDue = left.due_date ? new Date(left.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const rightDue = right.due_date ? new Date(right.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return compareValues(leftDue, rightDue, sortDirection);
      });
  }, [assigneeFilter, dueDateFilter, search, sortDirection, sortKey, statusFilter, tasks, userMap]);

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const SortButton = ({ label, column }: { label: string; column: SortKey }) => (
    <button
      type="button"
      onClick={() => setSort(column)}
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
    >
      {label}
      <ArrowUpDown className={cn('h-3 w-3', sortKey === column && 'text-primary')} />
    </button>
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tasks..."
          className="h-8 w-full text-[13px] sm:w-64"
        />

        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-8 w-full text-[13px] sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {users.map((user) => (
              <SelectItem key={getUserId(user)} value={getUserId(user)}>
                {user.full_name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | 'all')}>
          <SelectTrigger className="h-8 w-full text-[13px] sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Pending Review</SelectItem>
            <SelectItem value="needs_revision">Needs Revision</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dueDateFilter} onValueChange={(value) => setDueDateFilter(value as DueDateFilter)}>
          <SelectTrigger className="h-8 w-full text-[13px] sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All due dates</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="today">Due today</SelectItem>
            <SelectItem value="next_7_days">Next 7 days</SelectItem>
            <SelectItem value="no_due_date">No due date</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-[13px]"
          onClick={() => {
            setAssigneeFilter('all');
            setStatusFilter('all');
            setDueDateFilter('all');
            setSearch('');
          }}
        >
          Reset
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-accent/40">
                <th className="px-4 py-3 text-left"><SortButton label="Task" column="title" /></th>
                <th className="px-4 py-3 text-left"><SortButton label="Assignee" column="assignee" /></th>
                <th className="px-4 py-3 text-left"><SortButton label="Status" column="status" /></th>
                <th className="px-4 py-3 text-left"><SortButton label="Priority" column="priority" /></th>
                <th className="px-4 py-3 text-left"><SortButton label="Due date" column="due_date" /></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm italic text-muted-foreground">
                    No tasks match the current filters.
                  </td>
                </tr>
              )}

              {filteredTasks.map((task) => {
                const assignee = task.assignee_id ? userMap[task.assignee_id] : null;
                const status = STATUS_CONFIG[task.status];
                const priority = PRIORITY_CONFIG[task.priority];
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

                return (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="group cursor-pointer border-b border-border transition-all last:border-0 hover:bg-accent/20"
                  >
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
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
                        <span className="text-xs italic text-muted-foreground/50">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="secondary" className={cn('px-2 py-0.5 text-[10px] font-bold', status?.color)}>
                        <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', status?.dot)} />
                        {status?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('text-xs font-bold uppercase tracking-tight', priority?.color)}>
                        {priority?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {task.due_date ? (
                        <span className={cn('text-xs font-medium', isOverdue ? 'font-bold text-destructive' : 'text-muted-foreground')}>
                          {format(new Date(task.due_date), 'dd/MM/yyyy')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/30">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
