import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import type { ApiResponse, Attachment, PaginatedResponse, Task, TaskPriority, TaskStatus, User } from '@/types';
import type { Project } from '@/types';
import type { Comment } from '@/types';

const getUserId = (value?: string | User) => (typeof value === 'string' ? value : value?._id || value?.id || '');

const normalizeTask = (task: Task): Task => {
  const raw = task as unknown as {
    project_id?: string | Project;
    assignee_id?: string | User;
    reviewer_id?: string | User;
    created_by?: string | User;
  };
  const rawProject = raw.project_id;

  return {
    ...task,
    id: task.id || task._id || '',
    project: typeof rawProject === 'object' ? rawProject : task.project,
    project_id: typeof rawProject === 'object' ? rawProject._id || rawProject.id || '' : task.project_id,
    assignee: typeof raw.assignee_id === 'object' ? raw.assignee_id : task.assignee,
    assignee_id: getUserId(raw.assignee_id),
    reviewer: typeof raw.reviewer_id === 'object' ? raw.reviewer_id : task.reviewer,
    reviewer_id: getUserId(raw.reviewer_id),
    createdBy: typeof raw.created_by === 'object' ? raw.created_by : task.createdBy,
    created_by: getUserId(raw.created_by),
    attachment_count: task.attachment_count ?? task.attachments?.length ?? 0,
    subtasks: (task.subtasks || []).map((subtask) => ({
      ...subtask,
      id: subtask.id || subtask._id || '',
      done: subtask.done ?? subtask.is_completed ?? false,
      is_completed: subtask.is_completed ?? subtask.done ?? false,
    })),
  };
};

const normalizeComment = (comment: Comment): Comment => ({
  ...comment,
  id: comment.id || comment._id || '',
});

const readJson = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || response.statusText);
  }
  return payload;
};

export const taskService = {
  getTasks: async (
    token: string,
    params: { projectId?: string; assigneeId?: string; status?: TaskStatus | 'all'; limit?: number } = {}
  ): Promise<Task[]> => {
    const url = new URL(getApiUrl(API_ENDPOINTS.TASKS.LIST));
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 'all') {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = await readJson<PaginatedResponse<Task>>(response);
    return (payload.data || []).map(normalizeTask);
  },

  getProjectTasks: async (projectId: string, token: string): Promise<Task[]> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.TASKS.PROJECT(projectId)) + '?limit=100', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = await readJson<PaginatedResponse<Task>>(response);
    return (payload.data || []).map(normalizeTask);
  },

  createTask: async (
    data: {
      title: string;
      project_id: string;
      assignee_id?: string;
      reviewer_id?: string;
      priority?: TaskPriority;
      start_date?: string;
      due_date?: string;
      content_html?: string;
      attachments?: Attachment[];
    },
    token: string
  ): Promise<ApiResponse<Task>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.TASKS.CREATE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const payload = await readJson<ApiResponse<Task>>(response);
    return {
      ...payload,
      data: payload.data ? normalizeTask(payload.data) : payload.data,
    };
  },

  updateTaskStatus: async (taskId: string, status: TaskStatus, token: string): Promise<ApiResponse<Task>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.TASKS.STATUS(taskId)), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const payload = await readJson<ApiResponse<Task>>(response);
    return {
      ...payload,
      data: payload.data ? normalizeTask(payload.data) : payload.data,
    };
  },

  updateTask: async (taskId: string, data: Partial<Task>, token: string): Promise<ApiResponse<Task>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.TASKS.UPDATE(taskId)), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const payload = await readJson<ApiResponse<Task>>(response);
    return {
      ...payload,
      data: payload.data ? normalizeTask(payload.data) : payload.data,
    };
  },

  updateDetails: async (
    taskId: string,
    data: { content_html: string; attachments: Attachment[] },
    token: string
  ): Promise<ApiResponse<Task>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.TASKS.DETAILS(taskId)), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const payload = await readJson<ApiResponse<Task>>(response);
    return {
      ...payload,
      data: payload.data ? normalizeTask(payload.data) : payload.data,
    };
  },

  addSubtask: async (taskId: string, title: string, token: string): Promise<ApiResponse<Task>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.TASKS.SUBTASKS(taskId)), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });

    const payload = await readJson<ApiResponse<Task>>(response);
    return {
      ...payload,
      data: payload.data ? normalizeTask(payload.data) : payload.data,
    };
  },

  toggleSubtask: async (subtaskId: string, isCompleted: boolean, token: string): Promise<ApiResponse<Task>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.TASKS.SUBTASK(subtaskId)), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_completed: isCompleted }),
    });

    const payload = await readJson<ApiResponse<Task>>(response);
    return {
      ...payload,
      data: payload.data ? normalizeTask(payload.data) : payload.data,
    };
  },

  getComments: async (taskId: string, token: string): Promise<Comment[]> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.TASKS.COMMENTS(taskId)), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = await readJson<ApiResponse<Comment[]>>(response);
    return (payload.data || []).map(normalizeComment);
  },

  createComment: async (
    taskId: string,
    data: { text: string; attachments: Attachment[] },
    token: string
  ): Promise<ApiResponse<Comment>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.TASKS.COMMENTS(taskId)), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const payload = await readJson<ApiResponse<Comment>>(response);
    return {
      ...payload,
      data: payload.data ? normalizeComment(payload.data) : payload.data,
    };
  },

  submitResult: async (
    taskId: string,
    data: { note: string; submitted_files: Attachment[] },
    token: string
  ): Promise<ApiResponse<Task>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.TASKS.SUBMIT(taskId)), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const payload = await readJson<ApiResponse<Task>>(response);
    return {
      ...payload,
      data: payload.data ? normalizeTask(payload.data) : payload.data,
    };
  },

  reviewResult: async (
    taskId: string,
    data: { action: 'approve' | 'reject'; feedback_note?: string },
    token: string
  ): Promise<ApiResponse<Task>> => {
    const response = await fetch(getApiUrl(API_ENDPOINTS.TASKS.REVIEW(taskId)), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const payload = await readJson<ApiResponse<Task>>(response);
    return {
      ...payload,
      data: payload.data ? normalizeTask(payload.data) : payload.data,
    };
  },

  uploadFile: async (file: File, token: string): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(getApiUrl(API_ENDPOINTS.UPLOAD.FILE), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const payload = await readJson<ApiResponse<Attachment>>(response);
    if (!payload.data) {
      throw new Error(payload.message || 'Upload failed');
    }

    return payload.data;
  },
};
