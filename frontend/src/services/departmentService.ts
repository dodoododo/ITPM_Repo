/**
 * DEPARTMENT SERVICE
 * Tất cả API calls liên quan tới departments
 */

import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import type { Department, ApiResponse } from '@/types';

export const departmentService = {
  /**
   * Lấy danh sách tất cả phòng ban
   */
  getDepartments: async (token: string): Promise<ApiResponse<Department[]>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.DEPARTMENTS.LIST), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Get departments failed: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Lấy chi tiết phòng ban
   */
  getDepartment: async (id: string, token: string): Promise<ApiResponse<Department>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.DEPARTMENTS.GET(id)), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Get department failed: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Tạo phòng ban mới
   */
  createDepartment: async (
    data: { name: string; description?: string; color?: string },
    token: string
  ): Promise<ApiResponse<Department>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.DEPARTMENTS.CREATE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Create department failed: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Cập nhật phòng ban
   */
  updateDepartment: async (
    id: string,
    data: { name?: string; description?: string; color?: string },
    token: string
  ): Promise<ApiResponse<Department>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.DEPARTMENTS.UPDATE(id)), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Update department failed: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Thêm thành viên vào phòng ban
   */
  addMembers: async (
    departmentId: string,
    userIds: string[],
    token: string
  ): Promise<ApiResponse<Department>> => {
    const response = await fetch(
      getApiUrl(API_ENDPOINTS.DEPARTMENTS.ADD_MEMBERS(departmentId)),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_ids: userIds }),
      }
    );

    if (!response.ok) {
      throw new Error(`Add members failed: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Xóa thành viên khỏi phòng ban
   */
  removeMember: async (
    departmentId: string,
    userId: string,
    token: string
  ): Promise<ApiResponse<Department>> => {
    const response = await fetch(
      getApiUrl(API_ENDPOINTS.DEPARTMENTS.REMOVE_MEMBER(departmentId, userId)),
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Remove member failed: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Xóa phòng ban
   */
  deleteDepartment: async (id: string, token: string): Promise<ApiResponse<null>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.DEPARTMENTS.DELETE(id)), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Delete department failed: ${response.statusText}`);
    }

    return response.json();
  },
};
