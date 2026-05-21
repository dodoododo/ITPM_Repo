import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, LogOut, Mail, Save, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/userService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Settings() {
  const { user, token, logout, setAuthData } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [notificationEmail, setNotificationEmail] = useState(user?.notification_email || user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setFullName(user?.full_name || '');
    setNotificationEmail(user?.notification_email || user?.email || '');
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSave = async () => {
    const userId = user._id || user.id;
    if (!token || !userId) return;

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      const response = await userService.updateUser(userId, {
        full_name: fullName.trim(),
        notification_email: notificationEmail.trim(),
        role: user.role || 'employee',
        email: user.email,
      }, token);

      if (response.data) {
        setAuthData(response.data, token);
      }
      setSuccess('Da luu thong tin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong luu duoc thong tin');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Cai dat tai khoan</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cap nhat ho so ca nhan va email nhan thong bao.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2">
            <UserIcon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Ho so ca nhan</h2>
        </div>

        <div className="mb-6 flex items-center gap-4 rounded-md border border-border bg-accent/20 p-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xl font-bold">{user.full_name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{user.full_name}</p>
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {user.email}
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase text-primary">
              <ShieldCheck className="h-3 w-3" />
              {user.role}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <Label>Ho ten</Label>
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label className="space-y-2">
            <Label>Email dang nhap / email cong ty</Label>
            <Input value={user.email} disabled className="bg-muted/50" />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <Label>Email nhan thong bao</Label>
            <Input type="email" value={notificationEmail} onChange={(event) => setNotificationEmail(event.target.value)} />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || !fullName.trim()} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Luu thong tin
          </Button>
        </div>
      </section>

      <section className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-5">
        <div>
          <p className="text-sm font-bold text-red-700">Phien dang nhap</p>
          <p className="text-xs text-red-600">Dang xuat khoi thiet bi hien tai.</p>
        </div>
        <Button variant="outline" className="gap-2 border-red-200 text-red-700 hover:bg-red-100" onClick={() => logout(true)}>
          <LogOut className="h-4 w-4" />
          Dang xuat
        </Button>
      </section>
    </div>
  );
}
