import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';
import { 
  ListChecks, AlertTriangle, TrendingUp, Clock, Loader2, 
  Search, Filter, ChevronDown, CheckCircle2, Circle, ArrowRight
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type Task, type User, type Project } from '@/types';

// --- 1. MOCK DATA NÂNG CAO ---
const MOCK_USERS: User[] = [
  { id: 'u1', full_name: 'Tăng Ngọc Hậu', email: 'hau@itpm.pro', avatar: '' },
  { id: 'u2', full_name: 'Nguyễn Văn A', email: 'vana@itpm.pro', avatar: '' },
];

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Phòng Kỹ Thuật', status: 'active', progress: 45, color: '#059669' },
  { id: 'p2', name: 'Dự án AI Chatbot', status: 'planning', progress: 10, color: '#2563EB' },
];

const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Thiết kế Database cho hệ thống AI', project_id: 'p1', status: 'in_progress', priority: 'high', attachment_count: 2, assignee_id: 'u1', due_date: '2026-05-15' },
  { id: 't2', title: 'Hoàn thiện giao diện My Tasks giống Base', project_id: 'p1', status: 'todo', priority: 'medium', attachment_count: 0, assignee_id: 'u1', due_date: '2026-05-10' },
  { id: 't3', title: 'Fix lỗi API Base44 không hoạt động', project_id: 'p2', status: 'done', priority: 'high', attachment_count: 5, assignee_id: 'u2', due_date: '2026-04-20' },
  { id: 't4', title: 'Lên plan truyền thông tháng 6', project_id: 'p1', status: 'review', priority: 'low', attachment_count: 1, assignee_id: 'u2', due_date: '2026-05-01' },
];

const MOCK_ACTIVITIES = [
  { id: 'a1', user_id: 'u1', action: 'đã chuyển trạng thái', target: 'Fix lỗi API Base44', to: 'Hoàn thành', time: '10 phút trước' },
  { id: 'a2', user_id: 'u2', action: 'đã bình luận vào', target: 'Thiết kế Database', to: '', time: '2 giờ trước' },
  { id: 'a3', user_id: 'u1', action: 'đã tạo công việc mới', target: 'Lên plan truyền thông', to: '', time: 'Hôm qua' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string, fill: string }> = {
  todo: { label: 'Cần làm', color: 'text-slate-600', fill: '#94a3b8' },
  in_progress: { label: 'Đang làm', color: 'text-blue-600', fill: '#3b82f6' },
  review: { label: 'Chờ duyệt', color: 'text-amber-600', fill: '#f59e0b' },
  done: { label: 'Hoàn thành', color: 'text-emerald-600', fill: '#10b981' },
};

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedProject, setSelectedProject] = useState('all');

  // Queries
  const { data: tasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => MOCK_TASKS,
  });
  
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => MOCK_PROJECTS,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => MOCK_USERS,
  });

  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  // --- 2. INTERACTIVE FILTERING ---
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (selectedProject !== 'all') {
      filtered = filtered.filter(t => t.project_id === selectedProject);
    }
    // Giả lập filter theo thời gian (Thực tế sẽ parse Date)
    if (timeRange === 'week') {
      filtered = filtered.slice(0, Math.ceil(filtered.length / 2));
    }
    return filtered;
  }, [tasks, selectedProject, timeRange]);

  // --- 3. TÍNH TOÁN STATS KẾT HỢP FILTER ---
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter(t => t.status === 'done').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length;
    const overdue = filteredTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
    const kpi = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, overdue, kpi };
  }, [filteredTasks]);

  const performanceData = useMemo(() => 
    users.map(u => {
      const userTasks = filteredTasks.filter(t => t.assignee_id === u.id);
      return {
        name: u.full_name?.split(' ').pop() || '?',
        done: userTasks.filter(t => t.status === 'done').length,
        total: userTasks.length,
      };
    }).filter(d => d.total > 0)
  , [filteredTasks, users]);

  const recentTasks = useMemo(() => 
    filteredTasks.filter(t => t.status !== 'done').slice(0, 5)
  , [filteredTasks]);

  if (loadingTasks) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 -mx-6 -mt-6">
      {/* HEADER & GLOBAL FILTERS */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900 tracking-tight">Tổng quan hệ thống</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Báo cáo hiệu suất và tiến độ công việc real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input placeholder="Tìm nhanh..." className="h-8 w-48 pl-8 text-[12px] bg-slate-50 border-slate-200" />
          </div>
          <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
            <button onClick={() => setTimeRange('week')} className={cn("px-3 py-1 text-[12px] font-medium rounded-sm transition-colors", timeRange === 'week' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Tuần này</button>
            <button onClick={() => setTimeRange('month')} className={cn("px-3 py-1 text-[12px] font-medium rounded-sm transition-colors", timeRange === 'month' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Tháng này</button>
          </div>
          <select 
            className="h-8 text-[12px] border border-slate-200 rounded-md px-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="all">Tất cả dự án</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="p-6 overflow-auto custom-scrollbar flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox title="Tổng công việc" value={stats.total} icon={ListChecks} color="blue" />
            <StatBox title="Đang thực hiện" value={stats.inProgress} icon={Clock} color="amber" />
            <StatBox title="Trễ hạn" value={stats.overdue} icon={AlertTriangle} color="red" />
            <StatBox title="KPI Hoàn thành" value={`${stats.kpi}%`} icon={TrendingUp} color="emerald" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CỘT TRÁI: BIỂU ĐỒ & TIẾN ĐỘ */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Biểu đồ phân bổ */}
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[13px] font-bold text-slate-800 uppercase">Trạng thái công việc</h3>
                    <button className="text-slate-400 hover:text-slate-600"><Filter className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="h-48 flex items-center justify-center">
                    {stats.total === 0 ? <p className="text-xs text-slate-400 italic">Không có dữ liệu</p> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[
                            { name: 'Cần làm', value: filteredTasks.filter(t => t.status === 'todo').length },
                            { name: 'Đang làm', value: filteredTasks.filter(t => t.status === 'in_progress').length },
                            { name: 'Hoàn thành', value: filteredTasks.filter(t => t.status === 'done').length }
                          ]} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" strokeWidth={0}>
                            <Cell fill={STATUS_CONFIG.todo.fill} />
                            <Cell fill={STATUS_CONFIG.in_progress.fill} />
                            <Cell fill={STATUS_CONFIG.done.fill} />
                          </Pie>
                          <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    {Object.values(STATUS_CONFIG).filter(c => c.label !== 'Chờ duyệt').map((cfg, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.fill }} />{cfg.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Biểu đồ hiệu suất */}
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <h3 className="text-[13px] font-bold text-slate-800 uppercase mb-4">Top nhân sự</h3>
                  <div className="h-48">
                     {performanceData.length === 0 ? <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Không có dữ liệu</div> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={60} tick={{ fontSize: 11, fill: '#64748b' }} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                          <Bar dataKey="done" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} name="Hoàn thành" />
                          <Bar dataKey="total" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={12} name="Tổng việc" />
                        </BarChart>
                      </ResponsiveContainer>
                     )}
                  </div>
                </div>
              </div>

              {/* Danh sách việc cần chú ý (Clickable) */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-[13px] font-bold text-slate-800 uppercase">Công việc cần chú ý</h3>
                  <Link to="/my-tasks" className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1">Xem tất cả <ArrowRight className="w-3 h-3" /></Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {recentTasks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">Mọi thứ đã hoàn tất!</div>
                  ) : recentTasks.map(task => {
                    const assignee = userMap[task.assignee_id || ''];
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                    
                    return (
                      <div key={task.id} className="p-3 px-5 flex items-center justify-between hover:bg-slate-50 cursor-pointer group transition-colors">
                        <div className="flex items-center gap-3">
                          <Circle className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                          <div>
                            <p className="text-[13px] font-medium text-slate-700 group-hover:text-emerald-600 transition-colors">{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-500">{projects.find(p => p.id === task.project_id)?.name}</span>
                              {task.due_date && (
                                <span className={cn("text-[10px] font-semibold", isOverdue ? "text-red-500" : "text-amber-600")}>
                                  • Hạn: {task.due_date}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Avatar className="w-6 h-6 border border-white shadow-sm">
                          <AvatarImage src={assignee?.avatar} />
                          <AvatarFallback className="text-[9px] bg-slate-100 text-slate-600 font-bold">{assignee?.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* CỘT PHẢI: HOẠT ĐỘNG GẦN ĐÂY */}
            <div className="bg-white border border-slate-200 rounded-lg flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-[13px] font-bold text-slate-800 uppercase">Hoạt động gần đây</h3>
              </div>
              <div className="p-5 flex-1 overflow-auto">
                <div className="space-y-5 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {MOCK_ACTIVITIES.map(activity => {
                    const user = userMap[activity.user_id];
                    return (
                      <div key={activity.id} className="relative flex items-start gap-4">
                        <div className="relative z-10 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback className="text-[9px] font-bold text-emerald-700 bg-emerald-100">{user?.full_name?.[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="pt-1">
                          <p className="text-[12px] text-slate-600">
                            <span className="font-semibold text-slate-900">{user?.full_name}</span> {activity.action} <span className="font-medium text-slate-800">{activity.target}</span> {activity.to && <span className="text-emerald-600 font-semibold">{activity.to}</span>}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component cho các ô thống kê siêu nhỏ gọn
function StatBox({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    red: 'text-red-600 bg-red-50 border-red-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  };

  return (
    <div className="bg-white border border-slate-200 p-4 rounded-lg flex items-center gap-4 hover:shadow-md transition-shadow cursor-default">
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">{value}</p>
      </div>
    </div>
  );
}