import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import type { ApiResponse, User } from '@/types';

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
};
