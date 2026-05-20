import { useEffect, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { projectService } from '@/services/projectService';
import { taskService } from '@/services/taskService';
import { userService } from '@/services/userService';
import RichTextEditor from '@/components/tasks/RichTextEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Project, TaskPriority, User } from '@/types';

interface TaskForm {
  title: string;
  content_html: string;
  project_id: string;
  assignee_id: string;
  reviewer_id: string;
  priority: TaskPriority;
  start_date: string;
  due_date: string;
}

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  onCreated?: () => void;
}

const emptyForm: TaskForm = {
  title: '',
  content_html: '',
  project_id: '',
  assignee_id: 'none',
  reviewer_id: 'none',
  priority: 'medium',
  start_date: '',
  due_date: '',
};

const getEntityId = (value: { _id?: string; id?: string }) => value._id || value.id || '';

export default function CreateTaskModal({ open, onClose, defaultProjectId, onCreated }: CreateTaskModalProps) {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<TaskForm>({ ...emptyForm, project_id: defaultProjectId || '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm((current) => ({ ...current, project_id: defaultProjectId || current.project_id }));
    void loadOptions();
  }, [open, defaultProjectId, token]);

  const loadOptions = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const [projectResponse, userResponse] = await Promise.all([
        projectService.getProjects(token, { page: 1, limit: 100 }),
        userService.getUsers(token),
      ]);
      setProjects(projectResponse.data || []);
      setUsers(userResponse.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task form data');
    } finally {
      setIsLoading(false);
    }
  };

  const set = <K extends keyof TaskForm>(key: K, value: TaskForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setForm({ ...emptyForm, project_id: defaultProjectId || '' });
    setError('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !form.title.trim() || !form.project_id) return;

    try {
      setIsSaving(true);
      setError('');
      await taskService.createTask({
        title: form.title.trim(),
        project_id: form.project_id,
        assignee_id: form.assignee_id === 'none' ? undefined : form.assignee_id,
        reviewer_id: form.reviewer_id === 'none' ? undefined : form.reviewer_id,
        priority: form.priority,
        start_date: form.start_date || undefined,
        due_date: form.due_date || undefined,
        content_html: form.content_html,
      }, token);
      reset();
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tao cong viec moi</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div>
            <Label>Tieu de *</Label>
            <Input
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="Nhap tieu de cong viec..."
            />
          </div>

          <div>
            <Label>Mo ta</Label>
            <RichTextEditor value={form.content_html} onChange={(value) => set('content_html', value)} disabled={isSaving} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Du an *</Label>
              <Select value={form.project_id} onValueChange={(value) => set('project_id', value)}>
                <SelectTrigger><SelectValue placeholder={isLoading ? 'Dang tai...' : 'Chon du an'} /></SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={getEntityId(project)} value={getEntityId(project)}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Do uu tien</Label>
              <Select value={form.priority} onValueChange={(value) => set('priority', value as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thap</SelectItem>
                  <SelectItem value="medium">Trung binh</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                  <SelectItem value="urgent">Khan cap</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Assignee</Label>
              <Select value={form.assignee_id} onValueChange={(value) => set('assignee_id', value)}>
                <SelectTrigger><SelectValue placeholder="Chon nguoi lam" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chua phan cong</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={getEntityId(user)} value={getEntityId(user)}>{user.full_name || user.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reviewer</Label>
              <Select value={form.reviewer_id} onValueChange={(value) => set('reviewer_id', value)}>
                <SelectTrigger><SelectValue placeholder="Chon nguoi duyet" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chua co reviewer</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={getEntityId(user)} value={getEntityId(user)}>{user.full_name || user.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Ngay bat dau</Label>
              <Input type="date" value={form.start_date} onChange={(event) => set('start_date', event.target.value)} />
            </div>
            <div>
              <Label>Han chot</Label>
              <Input type="date" value={form.due_date} onChange={(event) => set('due_date', event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Huy</Button>
            <Button type="submit" disabled={!form.title.trim() || !form.project_id || isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tao cong viec'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
