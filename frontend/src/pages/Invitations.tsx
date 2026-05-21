import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Edit, Loader2, Lock, Mail, RefreshCcw, RotateCcw, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { departmentService } from '@/services/departmentService';
import { userService, type AdminConfigStatus, type UserPayload } from '@/services/userService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AccountStatus, Department, User, UserRole } from '@/types';

const getEntityId = (value?: string | { _id?: string; id?: string }) => (
  typeof value === 'string' ? value : value?._id || value?.id || ''
);

const statusLabels: Record<AccountStatus, string> = {
  pending: 'Pending invitation',
  active: 'Active',
  locked: 'Locked',
  disabled: 'Disabled',
};

const emptyForm: UserPayload = {
  full_name: '',
  email: '',
  notification_email: '',
  role: 'employee',
  department_id: '',
  position_title: '',
  manager_id: '',
};

export const InvitationsPage = () => {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [configStatus, setConfigStatus] = useState<AdminConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionUserId, setActionUserId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserPayload>(emptyForm);

  const canManage = user?.role === 'admin';

  useEffect(() => {
    void loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError('');
      const [userResponse, departmentResponse, configResponse] = await Promise.all([
        userService.getUsers(token),
        departmentService.getDepartments(token),
        userService.getAdminConfigStatus(token),
      ]);
      setUsers(userResponse.data || []);
      setDepartments(departmentResponse.data || []);
      setConfigStatus(configResponse.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user management data');
    } finally {
      setIsLoading(false);
    }
  };

  const managerOptions = useMemo(
    () => users.filter((item) => ['admin', 'manager'].includes(String(item.role))),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((item) => {
      const status = (item.account_status || (item.isActive === false ? 'locked' : 'active')) as AccountStatus;
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesSearch = !keyword
        || item.full_name.toLowerCase().includes(keyword)
        || item.email.toLowerCase().includes(keyword)
        || item.position_title?.toLowerCase().includes(keyword);
      return matchesStatus && matchesSearch;
    });
  }, [users, search, statusFilter]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (target: User) => {
    setEditingUser(target);
    setForm({
      full_name: target.full_name,
      email: target.email,
      company_email: target.company_email || target.email,
      notification_email: target.notification_email || target.email,
      role: (target.role || 'employee') as UserRole,
      department_id: getEntityId(target.department_id),
      position_title: target.position_title || '',
      manager_id: getEntityId(target.manager_id),
    });
    setShowDialog(true);
  };

  const setFormValue = (key: keyof UserPayload, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!token || !form.full_name.trim() || !form.email.trim()) return;

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      const payload: UserPayload = {
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        company_email: form.company_email?.trim() || form.email.trim(),
        notification_email: form.notification_email?.trim() || form.email.trim(),
        department_id: form.department_id || undefined,
        manager_id: form.manager_id || undefined,
        position_title: form.position_title?.trim(),
      };

      const response = editingUser
        ? await userService.updateUser(getEntityId(editingUser), payload, token)
        : await userService.createUser(payload, token);

      if (response.data) {
        setUsers((current) => editingUser
          ? current.map((item) => (getEntityId(item) === getEntityId(response.data as User) ? response.data as User : item))
          : [response.data as User, ...current]);
      }

      setSuccess(editingUser ? 'Da cap nhat nguoi dung' : 'Da tao tai khoan va gui email moi');
      setShowDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save user failed');
    } finally {
      setIsSaving(false);
    }
  };

  const runUserAction = async (target: User, action: 'resend' | 'reset' | AccountStatus) => {
    if (!token) return;
    const id = getEntityId(target);
    try {
      setActionUserId(`${id}:${action}`);
      setError('');
      setSuccess('');

      if (action === 'resend') {
        await userService.resendInvite(id, token);
        setSuccess('Da gui lai email moi');
      } else if (action === 'reset') {
        await userService.resetPassword(id, token);
        setSuccess('Da gui email reset mat khau');
      } else {
        const response = await userService.updateAccountStatus(id, action, token);
        if (response.data) {
          setUsers((current) => current.map((item) => (getEntityId(item) === id ? response.data as User : item)));
        }
        setSuccess('Da cap nhat trang thai tai khoan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionUserId('');
    }
  };

  const getDepartmentName = (value?: string | Department) => {
    if (typeof value === 'object' && value) return value.name;
    return departments.find((department) => getEntityId(department) === value)?.name || 'Chua gan';
  };

  const getManagerName = (value?: string | User) => {
    if (typeof value === 'object' && value) return value.full_name;
    return users.find((item) => getEntityId(item) === value)?.full_name || 'Chua gan';
  };

  if (!canManage) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
        Chi admin moi duoc truy cap User Management.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin / User Management</h1>
          <p className="mt-1 text-sm text-slate-500">Quan ly tai khoan noi bo, email cong ty, phong ban, chuc vu va manager truc tiep.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Tao tai khoan
        </Button>
      </div>

      {configStatus && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className={`rounded-md border p-3 text-sm ${configStatus.mail.configured ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            <div className="flex items-center gap-2 font-semibold">
              {configStatus.mail.configured ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              Mail provider: {configStatus.mail.configured ? 'Da cau hinh' : 'Chua cau hinh'}
            </div>
            {!configStatus.mail.configured && <p className="mt-1">Thieu: {configStatus.mail.missing.join(', ')}</p>}
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="flex items-center gap-2 font-semibold">
              <Mail className="h-4 w-4" />
              Cap phat email cong ty
            </div>
            <p className="mt-1">{configStatus.google_workspace.configured ? 'Google Workspace Admin SDK da cau hinh.' : 'Chua tich hop cap phat email tu dong. Admin nhap email cong ty da ton tai.'}</p>
          </div>
        </div>
      )}

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3 md:flex-row md:items-center">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tim theo ten, email, chuc vu..." className="md:max-w-sm" />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AccountStatus | 'all')}>
          <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca trang thai</SelectItem>
            <SelectItem value="pending">Pending invitation</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadData} className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(260px,1.4fr)_130px_150px_150px_140px_210px] gap-0 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase text-slate-500">
          <div>Nguoi dung</div>
          <div>Role</div>
          <div>Phong ban</div>
          <div>Manager</div>
          <div>Trang thai</div>
          <div className="text-right">Action</div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Khong co nguoi dung phu hop.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map((item) => {
              const id = getEntityId(item);
              const status = (item.account_status || (item.isActive === false ? 'locked' : 'active')) as AccountStatus;
              const pending = status === 'pending';
              const actionLoading = actionUserId.startsWith(`${id}:`);

              return (
                <div key={id} className="grid grid-cols-[minmax(260px,1.4fr)_130px_150px_150px_140px_210px] items-center gap-0 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{item.full_name}</p>
                    <p className="truncate text-xs text-slate-500">{item.email}</p>
                    <p className="truncate text-xs text-slate-400">
                      Notify: {item.notification_email || item.email} / {item.position_title || 'Chua gan chuc vu'}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      Created: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '--'} / Last login: {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString('vi-VN') : '--'}
                    </p>
                  </div>
                  <div className="font-medium capitalize">{item.role}</div>
                  <div className="truncate text-slate-600">{getDepartmentName(item.department_id)}</div>
                  <div className="truncate text-slate-600">{getManagerName(item.manager_id)}</div>
                  <div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{statusLabels[status]}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} disabled={actionLoading}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {pending && (
                      <Button variant="ghost" size="icon" onClick={() => runUserAction(item, 'resend')} disabled={actionLoading || !configStatus?.mail.configured} title={!configStatus?.mail.configured ? 'Chuc nang chua duoc cau hinh' : 'Gui lai email moi'}>
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => runUserAction(item, 'reset')} disabled={actionLoading || !configStatus?.mail.configured || status === 'disabled'} title={!configStatus?.mail.configured ? 'Chuc nang chua duoc cau hinh' : 'Reset mat khau'}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Select value={status} onValueChange={(value) => runUserAction(item, value as AccountStatus)} disabled={actionLoading}>
                      <SelectTrigger className="h-8 w-28 text-xs"><Lock className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="locked">Locked</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Sua nguoi dung' : 'Tao tai khoan moi'}</DialogTitle>
            <DialogDescription>
              Tai khoan dang nhap noi bo tach rieng email cong ty va email nhan thong bao. He thong khong tu cap phat email cong ty khi Google Workspace chua duoc cau hinh.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Ho ten">
              <Input value={form.full_name} onChange={(event) => setFormValue('full_name', event.target.value)} />
            </Field>
            <Field label="Email cong ty / dang nhap">
              <Input type="email" value={form.email} onChange={(event) => setFormValue('email', event.target.value)} disabled={Boolean(editingUser)} />
            </Field>
            <Field label="Email thong bao">
              <Input type="email" value={form.notification_email || ''} onChange={(event) => setFormValue('notification_email', event.target.value)} />
            </Field>
            <Field label="Chuc vu">
              <Input value={form.position_title || ''} onChange={(event) => setFormValue('position_title', event.target.value)} />
            </Field>
            <Field label="Role">
              <Select value={form.role} onValueChange={(value) => setFormValue('role', value as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Phong ban">
              <Select value={form.department_id || 'none'} onValueChange={(value) => setFormValue('department_id', value === 'none' ? '' : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chua gan</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={getEntityId(department)} value={getEntityId(department)}>{department.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Quan ly truc tiep">
              <Select value={form.manager_id || 'none'} onValueChange={(value) => setFormValue('manager_id', value === 'none' ? '' : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chua gan</SelectItem>
                  {managerOptions.map((manager) => (
                    <SelectItem key={getEntityId(manager)} value={getEntityId(manager)}>{manager.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Huy</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.full_name.trim() || !form.email.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingUser ? 'Luu thay doi' : 'Tao va gui moi'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="space-y-1.5">
    <span className="block text-sm font-medium text-slate-700">{label}</span>
    {children}
  </label>
);

export default InvitationsPage;
