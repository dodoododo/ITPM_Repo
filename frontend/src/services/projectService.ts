import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import type { ApiResponse, PaginatedResponse, Project, ProjectStatus } from '@/types';

export interface ProjectListParams {
  status?: ProjectStatus | 'all';
  department_id?: string;
  page?: number;
  limit?: number;
}

export interface ProjectPayload {
  name: string;
  description?: string;
  color?: string;
  status?: ProjectStatus;
  progress?: number;
  start_date?: string;
  end_date?: string;
  department_id?: string;
  owner_id: string;
  member_ids?: string[];
}

const readJson = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || response.statusText);
  }
  return payload;
};

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const projectId = (project: Project) => project._id || project.id;

export const projectService = {
  getProjects: async (
    token: string,
    params: ProjectListParams = {}
  ): Promise<PaginatedResponse<Project>> => {
    const url = new URL(getApiUrl(API_ENDPOINTS.PROJECTS.LIST));

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 'all') {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      headers: authHeaders(token),
    });

    return readJson<PaginatedResponse<Project>>(response);
  },

  getProject: async (id: string, token: string): Promise<ApiResponse<Project>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.PROJECTS.GET(id)), {
      headers: authHeaders(token),
    });

    return readJson<ApiResponse<Project>>(response);
  },

  createProject: async (data: ProjectPayload, token: string): Promise<ApiResponse<Project>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.PROJECTS.CREATE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify(data),
    });

    return readJson<ApiResponse<Project>>(response);
  },

  updateProject: async (
    id: string,
    data: Partial<Omit<ProjectPayload, 'owner_id' | 'member_ids'>>,
    token: string
  ): Promise<ApiResponse<Project>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.PROJECTS.UPDATE(id)), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify(data),
    });

    return readJson<ApiResponse<Project>>(response);
  },

  updateOwner: async (id: string, ownerId: string, token: string): Promise<ApiResponse<Project>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.PROJECTS.UPDATE_OWNER(id)), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify({ owner_id: ownerId }),
    });

    return readJson<ApiResponse<Project>>(response);
  },

  addMembers: async (id: string, userIds: string[], token: string): Promise<ApiResponse<Project>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.PROJECTS.ADD_MEMBERS(id)), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify({ user_ids: userIds }),
    });

    return readJson<ApiResponse<Project>>(response);
  },

  removeMember: async (project: Project, userId: string, token: string): Promise<ApiResponse<Project>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.PROJECTS.REMOVE_MEMBER(projectId(project), userId)), {
      method: 'DELETE',
      headers: authHeaders(token),
    });

    return readJson<ApiResponse<Project>>(response);
  },
};
