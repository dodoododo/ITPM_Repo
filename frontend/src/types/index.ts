// --- 1. ENUMS & LITERAL TYPES ---

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on_hold';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export type Priority = 'low' | 'medium' | 'high';

// --- 2. CORE INTERFACES ---

export interface User {
  id: string;
  full_name: string;
  email: string;
  avatar?: string;
  role?: string;
}

export interface Department {
  id: string; // Đổi thành bắt buộc vì khi dùng Map/List luôn cần ID
  name: string;
  description?: string;
  color?: string;
  member_ids?: string[];
  created_at?: string;
}

export interface Project {
  id: string; 
  name: string;
  description?: string;
  color?: string;
  status: ProjectStatus;
  progress: number;
  start_date?: string;
  end_date?: string;
  department_id?: string;
  member_ids?: string[];
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string; 
  title: string;
  description?: string;
  project_id: string;
  status: TaskStatus;
  priority: Priority;
  assignee_id?: string;
  reviewer_id?: string;
  start_date?: string;
  due_date?: string;
  subtasks?: Subtask[];
  attachment_count: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  content: string;
  created_at?: string;
  created_date?: string; // Dùng cho hiển thị format
}

// --- 3. HELPER TYPES (Cho logic UI) ---

// Dùng cho logic kéo thả Gantt Chart
export interface DraggingState {
  taskId: string;
  startX: number;
  origStartDate: string;
  origDueDate: string;
  deltaDays?: number;
}

// Dùng cho AppContext để fix lỗi "Type never"
export interface AppContextType {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  departments: Department[];
  projects: Project[];
  addProject: (project: any) => void;
}