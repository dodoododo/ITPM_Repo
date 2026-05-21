import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const validatePassword = (password: string) => {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number';
  return '';
};

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(token ? '' : 'Reset link is missing a token');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => Boolean(token && newPassword && confirmPassword), [token, newPassword, confirmPassword]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Confirmation password does not match');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({ token, newPassword });
      setSuccess('Mat khau da duoc dat lai. Dang chuyen ve trang dang nhap...');
      window.setTimeout(() => navigate('/login', { replace: true }), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong dat lai duoc mat khau');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Dat lai mat khau</CardTitle>
          <CardDescription>Nhap mat khau moi cho tai khoan cua ban.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mat khau moi</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={isLoading || !token} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xac nhan mat khau</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={isLoading || !token} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !canSubmit}>
              {isLoading ? 'Dang cap nhat...' : 'Dat lai mat khau'}
            </Button>
            <Link to="/login" className="block text-center text-sm font-medium text-blue-600 hover:underline">
              Quay lai dang nhap
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
