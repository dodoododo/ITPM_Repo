/**
 * API Response Types
 * Chuẩn hóa response từ backend
 */

import type { Task } from './task.types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    skip: number;
    limit: number;
  };
}

export interface KanbanResponse {
  success: boolean;
  data: {
    todo: Task[];
    in_progress: Task[];
    review: Task[];
    done: Task[];
  };
}
