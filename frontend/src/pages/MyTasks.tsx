import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { type Task, type Project, type User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  Circle,
  MoreHorizontal,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- 1. MOCK DATA TƯƠNG ĐƯƠNG BASE WEWORK ---
const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Phòng Kỹ Thuật', status: 'active', progress: 0, color: '#059669' },
  { id: 'p2', name: 'Dự án AI Chatbot', status: 'active', progress: 0, color: '#2563EB' },
  { id: 'p3', name: 'Marketing & Sales', status: 'active', progress: 0, color: '#DC2626' },
];

const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Hoàn thiện giao diện My Tasks giống Base', assignee_id: 'u1', status: 'todo', priority: 'high', project_id: 'p1', attachment_count: 0, due_date: '2026-05-10' },
  { id: 't2', title: 'Fix lỗi API Base44 không hoạt động', assignee_id: 'u1', status: 'in_progress', priority: 'high', project_id: 'p1', attachment_count: 2, due_date: '2026-05-06' },
  { id: 't3', title: 'Thiết kế Database cho hệ thống AI', assignee_id: 'u1', status: 'review', priority: 'medium', project_id: 'p2', attachment_count: 5, due_date: '2026-05-15' },
  { id: 't4', title: 'Lên plan truyền thông tháng 6', assignee_id: 'u1', status: 'done', priority: 'low', project_id: 'p3', attachment_count: 1, due_date: '2026-05-01' },
];

const STATUS_CONFIG: Record<string, { label: string, classes: string }> = {
  todo: { label: 'Cần làm', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  in_progress: { label: 'Đang làm', classes: 'bg-amber-50 text-amber-600 border-amber-200' },
  review: { label: 'Cần review', classes: 'bg-blue-50 text-blue-600 border-blue-200' },
  done: { label: 'Hoàn thành', classes: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

export default function MyTasks() {
  const { user } = useAuth();
  const userId = user?.id || 'u1';

  const [activeTab, setActiveTab] = useState('my_tasks');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'p1': true, 'p2': true, 'p3': true
  });

  const toggleGroup = (projectId: string) => {
    setExpandedGroups(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  // Queries (Mock)
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['my-tasks', userId],
    queryFn: async () => MOCK_TASKS,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => MOCK_PROJECTS,
  });

  // Nhóm tasks theo Project
  const groupedTasks = useMemo(() => {
    const groups: Record<string, { project: Project, tasks: Task[] }> = {};
    
    projects.forEach(p => {
      groups[p.id] = { project: p, tasks: [] };
    });

    tasks.forEach(t => {
      if (groups[t.project_id]) {
        groups[t.project_id].tasks.push(t);
      }
    });

    // Chỉ giữ lại những nhóm có task
    return Object.values(groups).filter(g => g.tasks.length > 0);
  }, [tasks, projects]);

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 -mx-6 -mt-6">
      {/* 1. HEADER & TABS (Style Base Wework) */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10 px-6 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">Công việc của tôi</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-300">
              Cài đặt hiển thị
            </Button>
            <Button size="sm" className="h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Tạo công việc
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'my_tasks', label: 'Việc tôi làm' },
            { id: 'assigned_by_me', label: 'Việc tôi giao' },
            { id: 'following', label: 'Đang theo dõi' },
            { id: 'need_review', label: 'Cần review' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-3 text-[13px] font-medium transition-colors relative",
                activeTab === tab.id 
                  ? "text-emerald-600" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 2. FILTER BAR */}
      <div className="px-6 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Tìm kiếm công việc..." 
              className="h-8 pl-9 text-[13px] bg-white border-slate-300 focus-visible:ring-emerald-500"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-[13px] font-medium border-slate-300 gap-2 bg-white">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Lọc
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-[13px] font-medium text-slate-600 hover:bg-slate-200">
            Trạng thái <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-[13px] font-medium text-slate-600 hover:bg-slate-200">
            Dự án <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* 3. GROUPED TASK LIST */}
      <div className="flex-1 overflow-auto p-6 bg-white">
        <div className="max-w-6xl space-y-6">
          {groupedTasks.map(group => {
            const isExpanded = expandedGroups[group.project.id];
            
            return (
              <div key={group.project.id} className="space-y-1">
                {/* Group Header */}
                <div 
                  className="flex items-center gap-2 py-2 cursor-pointer group/header"
                  onClick={() => toggleGroup(group.project.id)}
                >
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

                {/* Task Rows */}
                {isExpanded && (
                  <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <th className="w-10 px-4 py-2 font-medium text-[12px] text-slate-500"></th>
                          <th className="px-4 py-2 font-medium text-[12px] text-slate-500">Tên công việc</th>
                          <th className="w-32 px-4 py-2 font-medium text-[12px] text-slate-500 text-center">Người nhận</th>
                          <th className="w-32 px-4 py-2 font-medium text-[12px] text-slate-500">Hạn chót</th>
                          <th className="w-32 px-4 py-2 font-medium text-[12px] text-slate-500 text-center">Trạng thái</th>
                          <th className="w-10 px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.tasks.map(task => {
                          const isDone = task.status === 'done';
                          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;
                          const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;

                          return (
                            <tr key={task.id} className="group/row hover:bg-slate-50 transition-colors">
                              {/* Checkbox Column */}
                              <td className="px-4 py-2.5 align-middle">
                                <button className="text-slate-300 hover:text-emerald-500 transition-colors mt-0.5">
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Circle className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                              
                              {/* Title Column */}
                              <td className="px-4 py-2.5 align-middle">
                                <span className={cn(
                                  "text-[13px] font-medium transition-colors cursor-pointer hover:text-emerald-600",
                                  isDone ? "text-slate-400 line-through" : "text-slate-700"
                                )}>
                                  {task.title}
                                </span>
                              </td>

                              {/* Assignee Column */}
                              <td className="px-4 py-2.5 align-middle text-center">
                                <Avatar className="h-6 w-6 inline-block">
                                  <AvatarImage src={user?.avatar} />
                                  <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700 font-medium">
                                    {user?.full_name?.[0] || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              </td>

                              {/* Deadline Column */}
                              <td className="px-4 py-2.5 align-middle">
                                <div className={cn(
                                  "flex items-center gap-1.5 text-[12px]",
                                  isDone ? "text-slate-400" : isOverdue ? "text-red-600 font-medium" : "text-slate-500"
                                )}>
                                  <Clock className="w-3.5 h-3.5" />
                                  {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : '--'}
                                </div>
                              </td>

                              {/* Status Column */}
                              <td className="px-4 py-2.5 align-middle text-center">
                                <Badge variant="outline" className={cn(
                                  "text-[11px] font-medium border rounded px-2 py-0.5 whitespace-nowrap",
                                  statusCfg.classes
                                )}>
                                  {statusCfg.label}
                                </Badge>
                              </td>

                              {/* Actions Column */}
                              <td className="px-4 py-2.5 align-middle text-right">
                                <button className="text-slate-400 opacity-0 group-hover/row:opacity-100 hover:text-slate-700 transition-all">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
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
      </div>
    </div>
  );
}