import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import type { ApiResponse, Project } from '@/types';

export type AnalyticsRange = 'week' | 'month';

export interface AnalyticsParams {
  range: AnalyticsRange;
  projectId?: string;
}

export interface AnalyticsSummary {
  total: number;
  done: number;
  in_progress: number;
  review: number;
  todo: number;
  overdue: number;
  kpi: number;
}

export interface PerformanceRow {
  user_id: string;
  full_name: string;
  email: string;
  avatar?: string;
  total: number;
  done: number;
  completion_rate: number;
}

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const readJson = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || response.statusText);
  }
  return payload;
};

const withAnalyticsParams = (endpoint: string, params: AnalyticsParams) => {
  const url = new URL(getApiUrl(endpoint));
  url.searchParams.set('range', params.range);

  if (params.projectId && params.projectId !== 'all') {
    url.searchParams.set('projectId', params.projectId);
  }

  return url.toString();
};

export const analyticsService = {
  getSummary: async (token: string, params: AnalyticsParams): Promise<AnalyticsSummary> => {
    const response = await fetch(withAnalyticsParams(API_ENDPOINTS.ANALYTICS.SUMMARY, params), {
      headers: authHeaders(token),
    });

    const payload = await readJson<ApiResponse<AnalyticsSummary>>(response);
    return payload.data || {
      total: 0,
      done: 0,
      in_progress: 0,
      review: 0,
      todo: 0,
      overdue: 0,
      kpi: 0,
    };
  },

  getPerformance: async (token: string, params: AnalyticsParams): Promise<PerformanceRow[]> => {
    const response = await fetch(withAnalyticsParams(API_ENDPOINTS.ANALYTICS.PERFORMANCE, params), {
      headers: authHeaders(token),
    });

    const payload = await readJson<ApiResponse<PerformanceRow[]>>(response);
    return payload.data || [];
  },

  getProjects: async (token: string): Promise<Project[]> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.ANALYTICS.PROJECTS), {
      headers: authHeaders(token),
    });

    const payload = await readJson<ApiResponse<Project[]>>(response);
    return (payload.data || []).map((project) => ({
      ...project,
      id: project.id || project._id || '',
      progress: project.progress ?? 0,
    }));
  },
};
