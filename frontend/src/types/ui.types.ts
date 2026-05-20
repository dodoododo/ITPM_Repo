/**
 * UI Helper Types
 * Dùng cho logic UI components
 */

import type { Department } from './user.types';

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  content: string;
  created_at?: string;
  created_date?: string;
}

export interface DraggingState {
  taskId: string;
  startX: number;
  origStartDate: string;
  origDueDate: string;
  deltaDays?: number;
}

export interface AppContextType {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  departments: Department[];
  projects: any[];
  addProject: (project: any) => void;
}
