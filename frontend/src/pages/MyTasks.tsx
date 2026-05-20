import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Clock, Filter, Loader2, Plus, Search } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { projectService } from '@/services/projectService';
import { taskService } from '@/services/taskService';
import { userService } from '@/services/userService';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import TaskDetailPanel from '@/components/tasks/TaskDetailPanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { type Project, type Task, type TaskStatus, type User } from '@/types';

const STATUS_CONFIG: Record<TaskStatus, { label: string; classes: string }> = {
  todo: { label: 'Todo', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  in_progress: { label: 'In Progress', classes: 'bg-amber-50 text-amber-600 border-amber-200' },
  review: { label: 'Review', classes: 'bg-blue-50 text-blue-600 border-blue-200' },
  done: { label: 'Done', classes: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

const getEntityId = (value?: string | { _id?: string; id?: string }) =>
  typeof value === 'string' ? value : value?._id || value?.id || '';

export default function MyTasks() {
  const { user, token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = user?._id || user?.id || '';

  useEffect(() => {
    void loadData();
  }, [token, userId, statusFilter]);

  const loadData = async () => {
    if (!token || !userId) return;

    try {
      setIsLoading(true);
      setError('');
      const [taskList, projectResponse, userResponse] = await Promise.all([
        taskService.getTasks(token, { assigneeId: userId, status: statusFilter, limit: 200 }),
        projectService.getProjects(token, { page: 1, limit: 100 }),
        userService.getUsers(token),
      ]);

      setTasks(taskList);
      setProjects(projectResponse.data || []);
      setUsers(userResponse.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load my tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const projectMap = useMemo(() => (
    new Map(projects.map((project) => [getEntityId(project), project]))
  ), [projects]);

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return tasks;
    return tasks.filter((task) => task.title.toLowerCase().includes(keyword));
  }, [tasks, search]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, { project: Project; tasks: Task[] }> = {};

    filteredTasks.forEach((task) => {
      const projectId = getEntityId(task.project_id) || task.project?.id || task.project?._id || 'unknown';
      const project = projectMap.get(projectId) || task.project || {
        id: projectId,
        name: 'Khong ro du an',
        status: 'planning',
        progress: 0,
      };

      if (!groups[projectId]) {
        groups[projectId] = { project, tasks: [] };
      }
      groups[projectId].tasks.push(task);
    });

    return Object.values(groups);
  }, [filteredTasks, projectMap]);

  useEffect(() => {
    setExpandedGroups((current) => {
      const next = { ...current };
      groupedTasks.forEach((group) => {
        const projectId = getEntityId(group.project);
        if (!(projectId in next)) next[projectId] = true;
      });
      return next;
    });
  }, [groupedTasks]);

  const toggleGroup = (projectId: string) => {
    setExpandedGroups((current) => ({ ...current, [projectId]: !current[projectId] }));
  };

  const handleTaskUpdated = (updated: Task) => {
    setTasks((current) => current.map((task) => task.id === updated.id ? updated : task));
    setSelectedTask(updated);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 -mx-6 -mt-6">
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10 px-6 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">Viec cua toi</h1>
          <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Tao cong viec
          </Button>
        </div>

        <div className="flex gap-6">
          {[
            { id: 'all', label: 'Tat ca' },
            { id: 'todo', label: 'Todo' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'review', label: 'Review' },
            { id: 'done', label: 'Done' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as TaskStatus | 'all')}
              className={cn(
                'pb-3 text-[13px] font-medium transition-colors relative',
                statusFilter === tab.id ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {tab.label}
              {statusFilter === tab.id && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-600" />}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tim kiem cong viec..."
              className="h-8 pl-9 text-[13px] bg-white border-slate-300 focus-visible:ring-emerald-500"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-[13px] font-medium border-slate-300 gap-2 bg-white">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Loc
          </Button>
        </div>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | 'all')}>
          <SelectTrigger className="h-8 w-40 bg-white text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca trang thai</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex-1 overflow-auto p-6 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : groupedTasks.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500 border border-dashed rounded-lg">
            Khong co task phu hop.
          </div>
        ) : (
          <div className="max-w-6xl space-y-6">
            {groupedTasks.map((group) => {
              const projectId = getEntityId(group.project);
              const isExpanded = expandedGroups[projectId] ?? true;

              return (
                <div key={projectId} className="space-y-1">
                  <div className="flex items-center gap-2 py-2 cursor-pointer group/header" onClick={() => toggleGroup(projectId)}>
                    <div className="w-5 h-5 flex items-center justify-center text-slate-400 group-hover/header:text-slate-700 transition-colors">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <h2 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                      {group.project.name}
                      <span className="text-[12px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {group.tasks.length}
                      </span>
                    </h2>
                  </div>

                  {isExpanded && (
                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50">
                            <th className="w-10 px-4 py-2" />
                            <th className="px-4 py-2 font-medium text-[12px] text-slate-500">Ten cong viec</th>
                            <th className="w-32 px-4 py-2 font-medium text-[12px] text-slate-500 text-center">Nguoi nhan</th>
                            <th className="w-32 px-4 py-2 font-medium text-[12px] text-slate-500">Han chot</th>
                            <th className="w-32 px-4 py-2 font-medium text-[12px] text-slate-500 text-center">Trang thai</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.tasks.map((task) => {
                            const isDone = task.status === 'done';
                            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;
                            const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                            const assignee = users.find((item) => getEntityId(item) === task.assignee_id) || user;

                            return (
                              <tr key={task.id} className="group/row hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 align-middle">
                                  {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}
                                </td>
                                <td className="px-4 py-2.5 align-middle">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedTask(task)}
                                    className={cn('text-[13px] font-medium transition-colors hover:text-emerald-600 text-left', isDone ? 'text-slate-400 line-through' : 'text-slate-700')}
                                  >
                                    {task.title}
                                  </button>
                                </td>
                                <td className="px-4 py-2.5 align-middle text-center">
                                  <Avatar className="h-6 w-6 inline-block">
                                    <AvatarImage src={assignee?.avatar} />
                                    <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700 font-medium">
                                      {assignee?.full_name?.[0] || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                </td>
                                <td className="px-4 py-2.5 align-middle">
                                  <div className={cn('flex items-center gap-1.5 text-[12px]', isDone ? 'text-slate-400' : isOverdue ? 'text-red-600 font-medium' : 'text-slate-500')}>
                                    <Clock className="w-3.5 h-3.5" />
                                    {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : '--'}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 align-middle text-center">
                                  <Badge variant="outline" className={cn('text-[11px] font-medium border rounded px-2 py-0.5 whitespace-nowrap', status.classes)}>
                                    {status.label}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={loadData} />
      <TaskDetailPanel
        task={selectedTask}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        projectId={selectedTask?.project_id || ''}
        users={users}
        onUpdate={handleTaskUpdated}
      />
    </div>
  );
}
