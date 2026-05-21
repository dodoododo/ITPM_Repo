/**
 * DEPARTMENT SERVICE
 * Tất cả API calls liên quan tới departments
 */

import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import type { Department, ApiResponse } from '@/types';

export interface DepartmentPayload {
  name: string;
  code: string;
  managerId: string;
  description?: string;
  color?: string;
}

const readJson = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || response.statusText);
  }
  return payload;
};

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

    return readJson<ApiResponse<Department[]>>(response);
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

    return readJson<ApiResponse<Department>>(response);
  },

  /**
   * Tạo phòng ban mới
   */
  createDepartment: async (
    data: DepartmentPayload,
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

    return readJson<ApiResponse<Department>>(response);
  },

  /**
   * Cập nhật phòng ban
   */
  updateDepartment: async (
    id: string,
    data: Partial<DepartmentPayload>,
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

    return readJson<ApiResponse<Department>>(response);
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

    return readJson<ApiResponse<Department>>(response);
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

    return readJson<ApiResponse<Department>>(response);
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

    return readJson<ApiResponse<null>>(response);
  },
};
