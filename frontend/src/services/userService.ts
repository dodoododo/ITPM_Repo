import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import type { AccountStatus, ApiResponse, User, UserRole } from '@/types';

export interface UserPayload {
  full_name: string;
  email: string;
  company_email?: string;
  notification_email?: string;
  role: UserRole;
  department_id?: string;
  position_title?: string;
  manager_id?: string;
}

export interface AdminConfigStatus {
  mail: {
    configured: boolean;
    missing: string[];
    provider: string;
    from: string;
  };
  google_workspace: {
    configured: boolean;
    message: string;
  };
  office_viewer: {
    provider: string;
    configured: boolean;
  };
}

const normalizeUser = (user: User): User => ({
  ...user,
  id: user.id || user._id || '',
  isActive: user.isActive ?? true,
});

export const userService = {
  getUsers: async (token: string): Promise<ApiResponse<User[]>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.USERS.LIST), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || `Get users failed: ${response.statusText}`);
    }

    return {
      ...payload,
      data: (payload.data || []).map(normalizeUser),
    };
  },

  updateStatus: async (id: string, isActive: boolean, token: string): Promise<ApiResponse<User>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.USERS.UPDATE_STATUS(id)), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || `Update user status failed: ${response.statusText}`);
    }

    return payload;
  },

  updateAccountStatus: async (id: string, accountStatus: AccountStatus, token: string): Promise<ApiResponse<User>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.USERS.UPDATE_STATUS(id)), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ account_status: accountStatus }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || `Update user status failed: ${response.statusText}`);
    }

    return {
      ...payload,
      data: payload.data ? normalizeUser(payload.data) : payload.data,
    };
  },

  createUser: async (data: UserPayload, token: string): Promise<ApiResponse<User>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.USERS.CREATE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || `Create user failed: ${response.statusText}`);
    }

    return {
      ...payload,
      data: payload.data ? normalizeUser(payload.data) : payload.data,
    };
  },

  updateUser: async (id: string, data: Partial<UserPayload>, token: string): Promise<ApiResponse<User>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.USERS.UPDATE(id)), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || `Update user failed: ${response.statusText}`);
    }

    return {
      ...payload,
      data: payload.data ? normalizeUser(payload.data) : payload.data,
    };
  },

  resendInvite: async (id: string, token: string): Promise<ApiResponse<unknown>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.USERS.RESEND_INVITE(id)), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || `Resend invite failed: ${response.statusText}`);
    }

    return payload;
  },

  resetPassword: async (id: string, token: string): Promise<ApiResponse<null>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.USERS.RESET_PASSWORD(id)), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || `Reset password failed: ${response.statusText}`);
    }

    return payload;
  },

  getAdminConfigStatus: async (token: string): Promise<ApiResponse<AdminConfigStatus>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.USERS.CONFIG_STATUS), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || `Get admin config failed: ${response.statusText}`);
    }

    return payload;
  },
};
