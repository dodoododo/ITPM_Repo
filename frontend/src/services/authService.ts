import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import type { ApiResponse, Invitation, User, UserRole } from '@/types';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

interface InviteRequest {
  email: string;
  role: UserRole;
  department_id?: string;
}

interface AcceptInviteRequest {
  token: string;
  full_name: string;
  password: string;
}

const readJson = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || response.statusText);
  }
  return payload;
};

export const authService = {
  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.AUTH.LOGIN), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return readJson<LoginResponse>(response);
  },

  sendInvitation: async (data: InviteRequest, token: string): Promise<ApiResponse<unknown>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.WORKSPACE.INVITE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    return readJson<unknown>(response);
  },

  acceptInvitation: async (data: AcceptInviteRequest): Promise<ApiResponse<LoginResponse>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.WORKSPACE.ACCEPT_INVITE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return readJson<LoginResponse>(response);
  },

  getInvitations: async (token: string, status?: string): Promise<ApiResponse<Invitation[]>> => {
    const url = new URL(getApiUrl(API_ENDPOINTS.WORKSPACE.INVITATIONS));
    if (status) {
      url.searchParams.set('status', status);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return readJson<Invitation[]>(response);
  },

  getToken: (): string | null => localStorage.getItem('authToken'),

  setToken: (token: string): void => {
    localStorage.setItem('authToken', token);
  },

  clearToken: (): void => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  },

  getCurrentUser: (): User | null => {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  },

  setCurrentUser: (user: User): void => {
    localStorage.setItem('currentUser', JSON.stringify(user));
  },
};
