/**
 * Task Types
 * Phân hệ: LÕI CÔNG VIỆC
 */

import type { User } from './user.types';
import type { Project } from './project.types';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'needs_revision' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type Priority = TaskPriority;
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Attachment {
  file_name: string;
  file_url: string;
  file_type?: string;
  size?: number;
  uploaded_by?: string | User;
  uploaded_at?: string;
  storage_key?: string;
  preview_url?: string;
}

export interface Subtask {
  _id?: string;
  id: string;
  title: string;
  text?: string;
  is_completed?: boolean;
  isDone?: boolean;
  done?: boolean;
}

export interface TaskDependency {
  _id?: string;
  id?: string;
  title: string;
  status: TaskStatus;
  due_date?: string;
}

export interface ExecutionResult {
  note?: string;
  submitted_files?: Attachment[];
  submitted_at?: string;
  review_status?: ReviewStatus;
  feedback?: string;
  reject_reason?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface TaskKpiResult {
  score?: number;
  difficulty_weight?: number;
  timeliness_bonus?: number;
  days_delta?: number;
  completed_early?: boolean;
  calculated_at?: string;
}

export interface Task {
  _id?: string;
  id: string;
  title: string;
  content_html?: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  group_key?: string;
  group_name?: string;
  kpi_weight?: number;
  start_date?: string;
  due_date?: string;
  actualStartDate?: string;
  actualFinishDate?: string;
  attachment_count?: number;
  attachments?: Attachment[];
  subtasks?: Subtask[];
  project_id: string;
  project?: Project;
  assignee_id?: string;
  assignee?: User;
  reviewer_id?: string;
  reviewer?: User;
  created_by?: string;
  createdBy?: User;
  dependency_ids?: Array<string | TaskDependency>;
  dependencies?: TaskDependency[];
  execution_result?: ExecutionResult;
  kpi_result?: TaskKpiResult;
  createdAt?: string;
  updatedAt?: string;
}
