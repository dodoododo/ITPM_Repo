import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Clock, FolderKanban, ListChecks, Loader2, TrendingUp, Users } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { departmentService } from '@/services/departmentService';
import { projectService } from '@/services/projectService';
import { taskService } from '@/services/taskService';
import { userService } from '@/services/userService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Department, Project, Task, TaskStatus, User } from '@/types';

const PIE_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#ef4444', '#10b981'];
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Can lam',
  in_progress: 'Dang lam',
  review: 'Cho nghiem thu',
  needs_revision: 'Can sua',
  done: 'Hoan thanh',
};

const getEntityId = (value?: string | { _id?: string; id?: string }) => (
  typeof value === 'string' ? value : value?._id || value?.id || ''
);

export default function DepartmentDetail() {
  const { id: deptId = '' } = useParams();
  const { token } = useAuth();
  const [department, setDepartment] = useState<Department | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadData();
  }, [token, deptId]);

  const loadData = async () => {
    if (!token || !deptId) return;

    try {
      setIsLoading(true);
      setError('');
      const [departmentResponse, projectResponse, userResponse] = await Promise.all([
        departmentService.getDepartment(deptId, token),
        projectService.getProjects(token, { department_id: deptId, page: 1, limit: 100 }),
        userService.getUsers(token),
      ]);

      const projectList = projectResponse.data || [];
      const taskEntries = await Promise.all(projectList.map(async (project) => {
        try {
          return await taskService.getProjectTasks(getEntityId(project), token);
        } catch {
          return [];
        }
      }));

      setDepartment(departmentResponse.data || null);
      setProjects(projectList);
      setUsers(userResponse.data || []);
      setTasks(taskEntries.flat());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc phong ban');
    } finally {
      setIsLoading(false);
    }
  };

  const deptData = useMemo(() => {
    if (!department) return null;
    const memberIds = new Set((department.member_ids || []).map(getEntityId));
    const members = users.filter((item) => memberIds.has(getEntityId(item)) || getEntityId(item.department_id) === deptId);
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((task) => task.status === 'done').length;
    const inProgressTasks = tasks.filter((task) => task.status === 'in_progress').length;
    const overdueTasks = tasks.filter((task) => task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done').length;
    const kpiProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const statusChartData = (Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => ({
      name: STATUS_LABELS[status],
      value: tasks.filter((task) => task.status === status).length,
    }));

    return { members, stats: { totalTasks, doneTasks, inProgressTasks, overdueTasks, kpiProgress }, statusChartData };
  }, [department, users, tasks, deptId]);

  if (isLoading) {
    return <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!department || !deptData) {
    return <div className="p-10 text-center text-sm text-slate-500">Khong tim thay phong ban.</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Link to="/departments" className="rounded-full p-2 transition-colors hover:bg-accent">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{department.name}</h1>
            <Badge variant="outline" className="border-primary/20 text-primary">{department.code || 'Phong ban'}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{department.description || 'Chua co mo ta.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tong cong viec" value={deptData.stats.totalTasks} icon={ListChecks} color="blue" />
        <StatCard title="Dang thuc hien" value={deptData.stats.inProgressTasks} icon={Clock} color="orange" />
        <StatCard title="Viec tre han" value={deptData.stats.overdueTasks} icon={AlertTriangle} color="red" />
        <StatCard title="KPI hoan thanh" value={`${deptData.stats.kpiProgress}%`} icon={TrendingUp} color="green" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview">Tong quan</TabsTrigger>
          <TabsTrigger value="projects">Du an</TabsTrigger>
          <TabsTrigger value="members">Thanh vien</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-6 text-sm font-bold uppercase tracking-wide">Trang thai cong viec</h3>
            <div className="h-[250px]">
              {tasks.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Chua co du lieu task.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deptData.statusChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={82} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {deptData.statusChartData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-6 text-sm font-bold uppercase tracking-wide">Tien do du an truc thuoc</h3>
            <div className="space-y-5">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chua co du an nao trong phong ban.</p>
              ) : projects.map((project) => {
                const projectTasks = tasks.filter((task) => getEntityId(task.project_id) === getEntityId(project));
                const done = projectTasks.filter((task) => task.status === 'done').length;
                const progress = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : project.progress || 0;
                return (
                  <div key={getEntityId(project)} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{project.name}</span>
                      <span className="font-bold text-primary">{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-accent">
                      <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: project.color || '#2563EB' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="projects" className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Link key={getEntityId(project)} to={`/projects/${getEntityId(project)}`} className="block rounded-lg border border-border bg-card p-4 transition hover:border-primary/50">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: `${project.color || '#2563EB'}20` }}>
                  <FolderKanban className="h-4 w-4" style={{ color: project.color || '#2563EB' }} />
                </div>
                <h4 className="font-bold">{project.name}</h4>
                <Badge className="ml-auto capitalize">{project.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{project.description || 'Khong co mo ta.'}</p>
            </Link>
          ))}
          {projects.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Chua co du an.</div>}
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b bg-accent/40 px-4 py-3 text-sm font-semibold">
              <Users className="h-4 w-4" />
              Thanh vien ({deptData.members.length})
            </div>
            <div className="divide-y divide-border">
              {deptData.members.map((member) => (
                <div key={getEntityId(member)} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_140px_180px] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="text-[10px] font-bold">{member.full_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{member.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="w-fit text-xs capitalize">{member.role}</Badge>
                  <p className="text-xs text-muted-foreground">{member.position_title || 'Chua gan chuc vu'}</p>
                </div>
              ))}
              {deptData.members.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Chua co thanh vien.</div>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: typeof ListChecks; color: 'blue' | 'orange' | 'red' | 'green' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    green: 'bg-green-50 text-green-600 border-green-100',
  };

  return (
    <div className={cn('flex items-start justify-between rounded-lg border bg-card p-5', colorMap[color])}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{title}</p>
        <p className="mt-1 text-2xl font-black">{value}</p>
      </div>
      <div className="rounded-md bg-white/60 p-2">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
