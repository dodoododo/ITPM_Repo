import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ChangePasswordState {
  passwordChangeToken?: string;
  email?: string;
  fullName?: string;
}

const validatePassword = (password: string) => {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number';
  return '';
};

export const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthData } = useAuth();
  const routeState = (location.state || {}) as ChangePasswordState;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passwordChangeToken = routeState.passwordChangeToken;
  const canSubmit = useMemo(() => Boolean(passwordChangeToken && newPassword && confirmPassword), [
    passwordChangeToken,
    newPassword,
    confirmPassword,
  ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!passwordChangeToken) {
      setError('Password change session is missing. Please log in again.');
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Confirmation password does not match');
      return;
    }

    try {
      setIsLoading(true);
      const response = await authService.changePassword({
        passwordChangeToken,
        newPassword,
      });

      if (!response.success || !response.data?.token) {
        throw new Error(response.message || 'Password change failed');
      }

      setAuthData(response.data.user, response.data.token);
      setSuccess('Password changed successfully');
      setTimeout(() => navigate('/', { replace: true }), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Change Password</CardTitle>
          <CardDescription>{routeState.email || 'Create a new password to continue'}</CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
              <CheckCircle className="w-12 h-12 text-green-600" />
              <h3 className="text-lg font-semibold text-green-700">{success}</h3>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {routeState.fullName && (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {routeState.fullName}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="********"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={isLoading || !passwordChangeToken}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="********"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={isLoading || !passwordChangeToken}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/login', { replace: true })}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={!canSubmit || isLoading}>
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
