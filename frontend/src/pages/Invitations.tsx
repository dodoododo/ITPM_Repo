import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Mail, ShieldOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { departmentService } from '@/services/departmentService';
import { userService } from '@/services/userService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Department, Invitation, User, UserRole } from '@/types';

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50', label: 'Dang cho' },
  accepted: { icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Da tham gia' },
  expired: { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50', label: 'Het han' },
};

export const InvitationsPage = () => {
  const { token } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('employee');
  const [inviteDepartmentId, setInviteDepartmentId] = useState('none');
  const [isSending, setIsSending] = useState(false);

  const grouped = useMemo(() => ({
    pending: invitations.filter((item) => item.status === 'pending'),
    accepted: invitations.filter((item) => item.status === 'accepted'),
    expired: invitations.filter((item) => item.status === 'expired'),
  }), [invitations]);

  useEffect(() => {
    void loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError('');
      const [invitationResponse, departmentResponse, userResponse] = await Promise.all([
        authService.getInvitations(token),
        departmentService.getDepartments(token),
        userService.getUsers(token),
      ]);

      setInvitations(invitationResponse.data || []);
      setDepartments(departmentResponse.data || []);
      setUsers(userResponse.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !token) return;

    try {
      setIsSending(true);
      setError('');
      const response = await authService.sendInvitation({
        email: inviteEmail.trim(),
        role: inviteRole,
        department_id: inviteDepartmentId === 'none' ? undefined : inviteDepartmentId,
      }, token);

      if (!response.success) {
        throw new Error(response.message || 'Failed to send invitation');
      }

      setInviteEmail('');
      setInviteRole('employee');
      setInviteDepartmentId('none');
      setShowInviteDialog(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleUser = async (user: User, isActive: boolean) => {
    const userId = user._id || user.id;
    if (!token || !userId) return;

    try {
      setUsers((current) => current.map((item) => (
        (item._id || item.id) === userId ? { ...item, isActive } : item
      )));
      await userService.updateStatus(userId, isActive, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
      await loadData();
    }
  };

  const renderInvitation = (invitation: Invitation) => {
    const config = statusConfig[invitation.status];
    const Icon = config.icon;

    return (
      <div key={invitation._id || invitation.id} className={`p-4 rounded-lg border ${config.bg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Icon className={`w-5 h-5 mt-1 flex-shrink-0 ${config.color}`} />
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{invitation.email}</p>
              <p className="text-sm text-gray-600">Role: {invitation.role}</p>
              <p className="text-sm text-gray-500">
                Het han: {new Date(invitation.expiresAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quan ly loi moi</h1>
          <p className="text-gray-600 mt-1">Gui email moi nhan su va khoa tai khoan khi can.</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
          <Mail className="w-4 h-4" />
          Gui loi moi
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
      ) : (
        <>
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">Dang cho ({grouped.pending.length})</TabsTrigger>
              <TabsTrigger value="accepted">Da tham gia ({grouped.accepted.length})</TabsTrigger>
              <TabsTrigger value="expired">Het han ({grouped.expired.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3">
              {grouped.pending.length ? grouped.pending.map(renderInvitation) : (
                <Card><CardContent className="text-center py-10 text-gray-600">Khong co loi moi dang cho</CardContent></Card>
              )}
            </TabsContent>
            <TabsContent value="accepted" className="space-y-3">
              {grouped.accepted.length ? grouped.accepted.map(renderInvitation) : (
                <Card><CardContent className="text-center py-10 text-gray-600">Chua co loi moi duoc chap nhan</CardContent></Card>
              )}
            </TabsContent>
            <TabsContent value="expired" className="space-y-3">
              {grouped.expired.length ? grouped.expired.map(renderInvitation) : (
                <Card><CardContent className="text-center py-10 text-gray-600">Khong co loi moi het han</CardContent></Card>
              )}
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldOff className="w-5 h-5" />
                Trang thai tai khoan
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {users.map((user) => (
                <div key={user._id || user.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email} - {user.role}</p>
                  </div>
                  <Switch checked={user.isActive ?? true} onCheckedChange={(checked) => handleToggleUser(user, checked)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gui loi moi</DialogTitle>
            <DialogDescription>Nhap email, role va phong ban mac dinh cho nhan su moi.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                placeholder="nhanvien@company.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Nhan vien</SelectItem>
                  <SelectItem value="manager">Quan ly</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phong ban</label>
              <Select value={inviteDepartmentId} onValueChange={setInviteDepartmentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Khong gan phong ban</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department._id || department.id} value={department._id || department.id || ''}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Huy</Button>
              <Button onClick={handleSendInvite} disabled={!inviteEmail || isSending}>
                {isSending ? 'Dang gui...' : 'Gui loi moi'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvitationsPage;
