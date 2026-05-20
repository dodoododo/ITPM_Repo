import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { departmentService } from '@/services/departmentService';
import { userService } from '@/services/userService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Department, User } from '@/types';

const getUserId = (user: User | string) => (typeof user === 'string' ? user : user._id || user.id || '');

const getDepartmentId = (department: Department) => department._id || department.id || '';

const normalizeDepartment = (department: Department): Department => ({
  ...department,
  member_count: department.member_count ?? department.member_ids?.length ?? 0,
});

export const DepartmentsPage = () => {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentDescription, setDepartmentDescription] = useState('');
  const [departmentColor, setDepartmentColor] = useState('#2563EB');

  const [memberDepartment, setMemberDepartment] = useState<Department | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    void loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError('');
      const [departmentResponse, userResponse] = await Promise.all([
        departmentService.getDepartments(token),
        userService.getUsers(token),
      ]);

      setDepartments((departmentResponse.data || []).map(normalizeDepartment));
      setUsers(userResponse.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingDepartment(null);
    setDepartmentName('');
    setDepartmentDescription('');
    setDepartmentColor('#2563EB');
    setShowDepartmentDialog(true);
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    setDepartmentName(department.name);
    setDepartmentDescription(department.description || '');
    setDepartmentColor(department.color || '#2563EB');
    setShowDepartmentDialog(true);
  };

  const handleSaveDepartment = async () => {
    if (!departmentName.trim() || !token) return;

    try {
      setError('');
      const payload = {
        name: departmentName.trim(),
        description: departmentDescription.trim(),
        color: departmentColor,
      };

      const response = editingDepartment
        ? await departmentService.updateDepartment(getDepartmentId(editingDepartment), payload, token)
        : await departmentService.createDepartment(payload, token);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to save department');
      }

      const savedDepartment = normalizeDepartment(response.data);
      setDepartments((current) => {
        if (!editingDepartment) return [savedDepartment, ...current];
        const editingId = getDepartmentId(editingDepartment);
        return current.map((department) => (
          getDepartmentId(department) === editingId ? savedDepartment : department
        ));
      });
      setShowDepartmentDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save department');
    }
  };

  const handleDeleteDepartment = async (department: Department) => {
    if (!token || !confirm('Ban chac chan muon xoa phong ban nay?')) return;

    try {
      const departmentId = getDepartmentId(department);
      await departmentService.deleteDepartment(departmentId, token);
      setDepartments((current) => current.filter((item) => getDepartmentId(item) !== departmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete department');
    }
  };

  const openMemberDialog = (department: Department) => {
    setMemberDepartment(department);
    setMemberSearch('');
    setSelectedUserIds([]);
  };

  const activeMemberIds = useMemo(() => {
    if (!memberDepartment?.member_ids) return new Set<string>();
    return new Set(memberDepartment.member_ids.map(getUserId));
  }, [memberDepartment]);

  const memberUsers = useMemo(() => {
    if (!memberDepartment?.member_ids) return [];
    return memberDepartment.member_ids.filter((member): member is User => typeof member !== 'string');
  }, [memberDepartment]);

  const availableUsers = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    return users.filter((user) => {
      const userId = getUserId(user);
      const matchesSearch = !keyword
        || user.full_name.toLowerCase().includes(keyword)
        || user.email.toLowerCase().includes(keyword);
      return matchesSearch && !activeMemberIds.has(userId);
    });
  }, [users, memberSearch, activeMemberIds]);

  const updateDepartmentInState = (department: Department) => {
    const normalized = normalizeDepartment(department);
    setDepartments((current) => current.map((item) => (
      getDepartmentId(item) === getDepartmentId(normalized) ? normalized : item
    )));
    setMemberDepartment(normalized);
  };

  const handleAddMembers = async () => {
    if (!token || !memberDepartment || selectedUserIds.length === 0) return;

    try {
      const response = await departmentService.addMembers(
        getDepartmentId(memberDepartment),
        selectedUserIds,
        token
      );

      if (response.data) {
        updateDepartmentInState(response.data);
      }
      setSelectedUserIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add members');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!token || !memberDepartment) return;

    try {
      const response = await departmentService.removeMember(getDepartmentId(memberDepartment), userId, token);
      if (response.data) {
        updateDepartmentInState(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const toggleSelectedUser = (userId: string, checked: boolean) => {
    setSelectedUserIds((current) => {
      if (checked) return [...new Set([...current, userId])];
      return current.filter((id) => id !== userId);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quan ly phong ban</h1>
          <p className="text-gray-600 mt-1">Tao phong ban, chinh sua thong tin va quan ly thanh vien.</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Tao phong ban
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-600">Dang tai...</div>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-600">
            Chua co phong ban nao.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {departments.map((department) => (
            <Card key={getDepartmentId(department)} className="hover:shadow-md transition">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: department.color }} />
                      <CardTitle className="text-lg truncate">{department.name}</CardTitle>
                    </div>
                    {department.description && (
                      <CardDescription className="mt-2 line-clamp-2">{department.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(department)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteDepartment(department)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">{department.member_count || 0} thanh vien</span>
                </div>

                <Button variant="outline" className="w-full gap-2" onClick={() => openMemberDialog(department)}>
                  <Users className="w-4 h-4" />
                  Quan ly thanh vien
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDepartment ? 'Chinh sua phong ban' : 'Tao phong ban'}</DialogTitle>
            <DialogDescription>Cap nhat ten, mo ta va mau hien thi cua phong ban.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ten phong ban</label>
              <Input value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mo ta</label>
              <Input value={departmentDescription} onChange={(event) => setDepartmentDescription(event.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mau sac</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={departmentColor}
                  onChange={(event) => setDepartmentColor(event.target.value)}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-600">{departmentColor}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDepartmentDialog(false)}>Huy</Button>
              <Button onClick={handleSaveDepartment} disabled={!departmentName.trim()}>
                {editingDepartment ? 'Luu thay doi' : 'Tao phong ban'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(memberDepartment)} onOpenChange={(open) => !open && setMemberDepartment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Thanh vien phong ban</DialogTitle>
            <DialogDescription>{memberDepartment?.name}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4" />
                Dang trong phong ({memberUsers.length})
              </div>
              <div className="border rounded-lg divide-y max-h-80 overflow-auto">
                {memberUsers.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">Chua co thanh vien.</div>
                ) : memberUsers.map((user) => (
                  <div key={getUserId(user)} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(getUserId(user))}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Tim nhan su..."
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="border rounded-lg divide-y max-h-80 overflow-auto">
                {availableUsers.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">Khong co nhan su phu hop.</div>
                ) : availableUsers.map((user) => {
                  const userId = getUserId(user);
                  return (
                    <label key={userId} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50">
                      <Checkbox
                        checked={selectedUserIds.includes(userId)}
                        onCheckedChange={(checked) => toggleSelectedUser(userId, checked === true)}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate">{user.full_name}</span>
                        <span className="block text-xs text-gray-500 truncate">{user.email}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <Button onClick={handleAddMembers} disabled={selectedUserIds.length === 0} className="w-full">
                Them {selectedUserIds.length > 0 ? selectedUserIds.length : ''} thanh vien
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentsPage;
