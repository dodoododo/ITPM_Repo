import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { type Task, type User, type Department, type Project, type TaskStatus } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  ArrowLeft, Loader2, Users, ListChecks, 
  TrendingUp, AlertTriangle, Clock, FolderKanban 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';

// --- 1. MOCK DATA NÂNG CAO (Kết nối các bảng) ---

const MOCK_USERS: User[] = [
  { id: 'u1', full_name: 'Tăng Ngọc Hậu', email: 'hau@itpm.pro', avatar: '', role: 'Leader' },
  { id: 'u2', full_name: 'Nguyễn Văn A', email: 'vana@itpm.pro', avatar: '', role: 'Developer' },
  { id: 'u3', full_name: 'Trần Thị B', email: 'thib@itpm.pro', avatar: '', role: 'Designer' },
];

const MOCK_DEPTS: Department[] = [
  { id: 'd1', name: 'Phòng Kỹ Thuật', description: 'Phát triển hệ thống lõi ITPM và AI OCR', color: '#2563EB', member_ids: ['u1', 'u2', 'u3'] },
  { id: 'd2', name: 'Ban Giám Đốc', description: 'Điều hành chiến lược', color: '#DC2626', member_ids: ['u1'] },
];

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'ITPM Workflow', department_id: 'd1', status: 'active', progress: 65, color: '#2563EB' },
  { id: 'p2', name: 'AI Japanese Learning', department_id: 'd1', status: 'planning', progress: 20, color: '#7C3AED' },
];

const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Thiết kế Database', project_id: 'p1', status: 'done', priority: 'high', assignee_id: 'u1', attachment_count: 2 },
  { id: 't2', title: 'Xây dựng API Auth', project_id: 'p1', status: 'in_progress', priority: 'high', assignee_id: 'u2', attachment_count: 0, due_date: '2026-04-20' },
  { id: 't3', title: 'Vẽ UI Kanban', project_id: 'p1', status: 'review', priority: 'medium', assignee_id: 'u3', attachment_count: 5 },
  { id: 't4', title: 'Nghiên cứu OCR Engine', project_id: 'p2', status: 'todo', priority: 'high', assignee_id: 'u1', attachment_count: 0, due_date: '2026-04-15' },
];

const PIE_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981'];

export default function DepartmentDetail() {
  const { id: deptId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  // --- 2. QUERIES (Giả lập) ---
  const { data: dept, isLoading: loadingDept } = useQuery({
    queryKey: ['department', deptId],
    queryFn: async () => MOCK_DEPTS.find(d => d.id === deptId) || null,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['dept-projects', deptId],
    queryFn: async () => MOCK_PROJECTS.filter(p => p.department_id === deptId),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => MOCK_USERS,
  });

  // --- 3. LOGIC TÍNH TOÁN KPI ---
  const deptData = useMemo(() => {
    if (!dept) return null;

    const members = users.filter(u => dept.member_ids?.includes(u.id));
    const projectIds = projects.map(p => p.id);
    const tasks = MOCK_TASKS.filter(t => projectIds.includes(t.project_id));

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
    
    const kpiProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const statusChartData = [
      { name: 'Cần làm', value: tasks.filter(t => t.status === 'todo').length },
      { name: 'Đang làm', value: tasks.filter(t => t.status === 'in_progress').length },
      { name: 'Đang duyệt', value: tasks.filter(t => t.status === 'review').length },
      { name: 'Hoàn thành', value: tasks.filter(t => t.status === 'done').length },
    ];

    return { members, tasks, stats: { totalTasks, doneTasks, inProgressTasks, overdueTasks, kpiProgress }, statusChartData };
  }, [dept, projects, users]);

  if (loadingDept) return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-primary" /></div>;
  if (!dept || !deptData) return <div className="p-10 text-center">Không tìm thấy phòng ban.</div>;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/departments" className="p-2 hover:bg-accent rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{dept.name}</h1>
            <Badge variant="outline" className="border-primary/20 text-primary">Phòng ban</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{dept.description}</p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tổng công việc" value={deptData.stats.totalTasks} icon={ListChecks} color="blue" />
        <StatCard title="Đang thực hiện" value={deptData.stats.inProgressTasks} icon={Clock} color="orange" />
        <StatCard title="Việc trễ hạn" value={deptData.stats.overdueTasks} icon={AlertTriangle} color="red" />
        <StatCard title="KPI Hoàn thành" value={`${deptData.stats.kpiProgress}%`} icon={TrendingUp} color="green" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="projects">Dự án</TabsTrigger>
          <TabsTrigger value="members">Thành viên</TabsTrigger>
        </TabsList>

        {/* OVERVIEW CONTENT */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-6">Trạng thái công việc</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deptData.statusChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" strokeWidth={0}>
                      {deptData.statusChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {deptData.statusChartData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs font-medium">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    {item.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-6">Tiến độ dự án trực thuộc</h3>
              <div className="space-y-6">
                {projects.map(project => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{project.name}</span>
                      <span className="font-bold text-primary">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-accent h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${project.progress}%`, backgroundColor: project.color }} />
                    </div>
                  </div>
                ))}
                {projects.length === 0 && <p className="text-sm text-muted-foreground italic">Chưa có dự án nào.</p>}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* PROJECTS CONTENT */}
        <TabsContent value="projects" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="block p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + '15' }}>
                    <FolderKanban className="w-4 h-4" style={{ color: p.color }} />
                  </div>
                  <h4 className="font-bold">{p.name}</h4>
                  <Badge className="ml-auto capitalize">{p.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-4">Mã dự án: {p.id.toUpperCase()}</p>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                  <span>Tiến độ</span>
                  <span>{p.progress}%</span>
                </div>
              </Link>
            ))}
          </div>
        </TabsContent>

        {/* MEMBERS CONTENT */}
        <TabsContent value="members" className="mt-6">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-accent/50 border-b border-border">
                <tr>
                  <th className="p-4 text-[10px] font-bold uppercase">Thành viên</th>
                  <th className="p-4 text-[10px] font-bold uppercase">Vai trò</th>
                  <th className="p-4 text-[10px] font-bold uppercase text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deptData.members.map(member => (
                  <tr key={member.id} className="hover:bg-accent/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px] font-bold">{member.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{member.full_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary" className="text-[10px]">{member.role}</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">Hồ sơ</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Component cho Stat Cards
function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red: "bg-red-50 text-red-600 border-red-100",
    green: "bg-green-50 text-green-600 border-green-100",
  };

  return (
    <div className={cn("p-5 rounded-xl border shadow-sm flex items-start justify-between bg-card", colorMap[color])}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{title}</p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div className="p-2 bg-white/50 rounded-lg">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}