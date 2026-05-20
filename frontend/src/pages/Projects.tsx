import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronDown, Filter, FolderKanban, Loader2, Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { departmentService } from '@/services/departmentService';
import { projectService, type ProjectPayload } from '@/services/projectService';
import { taskService } from '@/services/taskService';
import { userService } from '@/services/userService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Department, Project, ProjectStatus, Task, User } from '@/types';

const COLORS = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706', '#0891B2'];

const STATUS_CONFIG: Record<ProjectStatus, { label: string; classes: string }> = {
  planning: { label: 'Lap ke hoach', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  active: { label: 'Dang chay', classes: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  completed: { label: 'Hoan thanh', classes: 'bg-blue-50 text-blue-600 border-blue-200' },
  on_hold: { label: 'Tam dung', classes: 'bg-amber-50 text-amber-600 border-amber-200' },
};

const getEntityId = (value?: string | { _id?: string; id?: string }) =>
  typeof value === 'string' ? value : value?._id || value?.id || '';

const getProjectId = (project: Project) => project._id || project.id;

const getDepartmentName = (department?: string | Department, fallback?: Department) => {
  if (typeof department === 'object') return department.name;
  return fallback?.name || '';
};

const getMembers = (project: Project, users: User[]) => {
  const userMap = new Map(users.map((user) => [getEntityId(user), user]));
  return (project.member_ids || [])
    .map((member) => (typeof member === 'string' ? userMap.get(member) : member))
    .filter((member): member is User => Boolean(member));
};

interface ProjectFormState {
  name: string;
  description: string;
  department_id: string;
  owner_id: string;
  color: string;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
}

const defaultForm: ProjectFormState = {
  name: '',
  description: '',
  department_id: 'none',
  owner_id: '',
  color: COLORS[0],
  start_date: '',
  end_date: '',
  status: 'planning',
};

export default function Projects() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [taskMap, setTaskMap] = useState<Record<string, Task[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<ProjectFormState>(defaultForm);

  useEffect(() => {
    void loadData();
  }, [token, statusFilter, departmentFilter]);

  const loadData = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError('');
      const [projectResponse, departmentResponse, userResponse] = await Promise.all([
        projectService.getProjects(token, { status: statusFilter, department_id: departmentFilter, page: 1, limit: 50 }),
        departmentService.getDepartments(token),
        userService.getUsers(token),
      ]);

      const projectList = projectResponse.data || [];
      setProjects(projectList);
      setDepartments(departmentResponse.data || []);
      setUsers(userResponse.data || []);

      const taskEntries = await Promise.all(
        projectList.map(async (project) => {
          const id = getProjectId(project);
          try {
            return [id, await taskService.getProjectTasks(id, token)] as const;
          } catch {
            return [id, []] as const;
          }
        })
      );
      setTaskMap(Object.fromEntries(taskEntries));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const departmentMap = useMemo(() => (
    new Map(departments.map((department) => [getEntityId(department), department]))
  ), [departments]);

  const filteredProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return projects;
    return projects.filter((project) => (
      project.name.toLowerCase().includes(keyword)
      || project.description?.toLowerCase().includes(keyword)
    ));
  }, [projects, search]);

  const openCreate = () => {
    setForm({
      ...defaultForm,
      owner_id: users[0] ? getEntityId(users[0]) : '',
    });
    setShowCreate(true);
  };

  const setFormValue = (key: keyof ProjectFormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreateProject = async () => {
    if (!token || !form.name.trim() || !form.owner_id) return;

    try {
      setIsSaving(true);
      setError('');
      const payload: ProjectPayload = {
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
        status: form.status,
        department_id: form.department_id === 'none' ? undefined : form.department_id,
        owner_id: form.owner_id,
        member_ids: [form.owner_id],
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
      };

      const response = await projectService.createProject(payload, token);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to create project');
      }

      setProjects((current) => [response.data as Project, ...current]);
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white -mx-6 -mt-6">
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10 px-6 pt-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">Danh sach du an</h1>
            <p className="text-[13px] text-slate-500 mt-1">Theo doi tien do, phong ban va thanh vien du an.</p>
          </div>
          <Button size="sm" onClick={openCreate} className="h-8 text-[13px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-none">
            <Plus className="w-3.5 h-3.5" />
            Them du an
          </Button>
        </div>

        <div className="flex gap-6">
          {[
            { id: 'all', label: 'Tat ca' },
            { id: 'active', label: 'Dang chay' },
            { id: 'planning', label: 'Lap ke hoach' },
            { id: 'completed', label: 'Hoan thanh' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as ProjectStatus | 'all')}
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

      <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Tim kiem du an..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8 pl-9 text-[13px] bg-white border-slate-300 focus-visible:ring-emerald-500"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-[13px] font-medium border-slate-300 gap-2 bg-white text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Loc
          </Button>
        </div>

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="h-8 w-56 text-[13px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca phong ban</SelectItem>
            {departments.map((department) => (
              <SelectItem key={getEntityId(department)} value={getEntityId(department)}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white p-6">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 border-dashed rounded-lg bg-slate-50/50">
              <FolderKanban className="w-10 h-10 mb-3 text-slate-300" />
              <p className="text-[13px] font-medium">Chua co du an nao.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
              <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[12px] font-medium text-slate-500 uppercase tracking-wide">
                <div className="w-10" />
                <div className="flex-1">Ten du an</div>
                <div className="w-48 px-4">Tien do</div>
                <div className="w-32 px-4 text-center">Trang thai</div>
                <div className="w-36 px-4 text-center">Thanh vien</div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredProjects.map((project) => {
                  const projectTasks = taskMap[getProjectId(project)] || [];
                  const doneTasks = projectTasks.filter((task) => task.status === 'done').length;
                  const percentage = projectTasks.length > 0
                    ? Math.round((doneTasks / projectTasks.length) * 100)
                    : project.progress || 0;
                  const department = departmentMap.get(getEntityId(project.department_id));
                  const memberUsers = getMembers(project, users);
                  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;

                  return (
                    <Link
                      key={getProjectId(project)}
                      to={`/projects/${getProjectId(project)}`}
                      className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-10 flex-shrink-0">
                        <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: `${project.color || '#2563EB'}20` }}>
                          <FolderKanban className="w-3.5 h-3.5" style={{ color: project.color || '#2563EB' }} />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-[14px] font-medium text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                          {project.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {getDepartmentName(project.department_id, department) || 'Chua gan phong ban'}
                        </p>
                      </div>

                      <div className="w-48 px-4 flex-shrink-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-semibold text-slate-700">{percentage}%</span>
                          <span className="text-[10px] text-slate-400">{doneTasks}/{projectTasks.length} viec</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: project.color || '#10b981' }} />
                        </div>
                      </div>

                      <div className="w-32 px-4 flex-shrink-0 flex justify-center">
                        <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5 border whitespace-nowrap', status.classes)}>
                          {status.label}
                        </Badge>
                      </div>

                      <div className="w-36 px-4 flex-shrink-0 flex justify-center">
                        <div className="flex -space-x-1.5">
                          {memberUsers.slice(0, 4).map((member) => (
                            <Avatar key={getEntityId(member)} className="h-6 w-6 border-2 border-white">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="text-[9px] bg-slate-100 text-slate-600 font-medium">
                                {member.full_name?.[0] || member.email?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {memberUsers.length > 4 && (
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white text-[9px] font-medium text-slate-600 z-10">
                              +{memberUsers.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tao du an moi</DialogTitle>
            <DialogDescription>Chon chu nhiem, phong ban va thong tin theo doi tien do.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ten du an</label>
              <Input value={form.name} onChange={(event) => setFormValue('name', event.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Mo ta</label>
              <Textarea value={form.description} onChange={(event) => setFormValue('description', event.target.value)} rows={3} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chu nhiem</label>
                <Select value={form.owner_id} onValueChange={(value) => setFormValue('owner_id', value)}>
                  <SelectTrigger><SelectValue placeholder="Chon owner" /></SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={getEntityId(user)} value={getEntityId(user)}>{user.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phong ban</label>
                <Select value={form.department_id} onValueChange={(value) => setFormValue('department_id', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Khong gan</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={getEntityId(department)} value={getEntityId(department)}>{department.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ngay bat dau</label>
                <Input type="date" value={form.start_date} onChange={(event) => setFormValue('start_date', event.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ngay ket thuc</label>
                <Input type="date" value={form.end_date} onChange={(event) => setFormValue('end_date', event.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Trang thai</label>
                <Select value={form.status} onValueChange={(value) => setFormValue('status', value as ProjectStatus)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Lap ke hoach</SelectItem>
                    <SelectItem value="active">Dang chay</SelectItem>
                    <SelectItem value="on_hold">Tam dung</SelectItem>
                    <SelectItem value="completed">Hoan thanh</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mau sac</label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormValue('color', color)}
                      className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        outline: form.color === color ? `2px solid ${color}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Huy</Button>
              <Button onClick={handleCreateProject} disabled={!form.name.trim() || !form.owner_id || isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tao du an'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
