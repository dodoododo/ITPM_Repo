/**
 * API CONFIGURATION & ENDPOINTS
 * Centralized API URL management
 * 
 * Usage:
 * import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'
 * 
 * fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {})
 */

// Get API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Define all API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
  },
  
  // Workspace & Invitations
  WORKSPACE: {
    INVITE: '/workspace/invite',
    ACCEPT_INVITE: '/workspace/accept-invite',
    INVITATIONS: '/workspace/invitations',
  },
  
  // Users
  USERS: {
    LIST: '/users',
    GET: (id: string) => `/users/${id}`,
    UPDATE_STATUS: (id: string) => `/users/${id}/status`,
    UPDATE: (id: string) => `/users/${id}`,
  },
  
  // Departments
  DEPARTMENTS: {
    LIST: '/departments',
    GET: (id: string) => `/departments/${id}`,
    CREATE: '/departments',
    UPDATE: (id: string) => `/departments/${id}`,
    DELETE: (id: string) => `/departments/${id}`,
    ADD_MEMBERS: (id: string) => `/departments/${id}/members`,
    REMOVE_MEMBER: (id: string, userId: string) => `/departments/${id}/members/${userId}`,
  },

  // Projects
  PROJECTS: {
    LIST: '/projects',
    GET: (id: string) => `/projects/${id}`,
    CREATE: '/projects',
    UPDATE: (id: string) => `/projects/${id}`,
    UPDATE_OWNER: (id: string) => `/projects/${id}/owner`,
    ADD_MEMBERS: (id: string) => `/projects/${id}/members`,
    REMOVE_MEMBER: (id: string, userId: string) => `/projects/${id}/members/${userId}`,
  },

  // Tasks
  TASKS: {
    LIST: '/tasks',
    PROJECT: (projectId: string) => `/tasks/project/${projectId}`,
    CREATE: '/tasks',
    DETAILS: (taskId: string) => `/tasks/${taskId}/details`,
    SUBTASKS: (taskId: string) => `/tasks/${taskId}/subtasks`,
    SUBTASK: (subtaskId: string) => `/tasks/subtasks/${subtaskId}`,
    COMMENTS: (taskId: string) => `/tasks/${taskId}/comments`,
    SUBMIT: (taskId: string) => `/tasks/${taskId}/submit`,
    REVIEW: (taskId: string) => `/tasks/${taskId}/review`,
    STATUS: (taskId: string) => `/tasks/${taskId}/status`,
    UPDATE: (taskId: string) => `/tasks/${taskId}`,
  },

  UPLOAD: {
    FILE: '/upload',
  },

  ANALYTICS: {
    SUMMARY: '/analytics/summary',
    PERFORMANCE: '/analytics/performance',
    PROJECTS: '/analytics/projects',
  },

  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
  },
};

// Create full URL helper
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

export { API_BASE_URL };
