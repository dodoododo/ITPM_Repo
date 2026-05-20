/**
 * Task Types
 * Phân hệ: LÕI CÔNG VIỆC
 */

import type { User } from './user.types';
import type { Project } from './project.types';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type Priority = TaskPriority;
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Attachment {
  file_name: string;
  file_url: string;
  file_type?: string;
  size?: number;
}

export interface Subtask {
  _id?: string;
  id: string;
  title: string;
  is_completed?: boolean;
  done?: boolean;
}

export interface ExecutionResult {
  note?: string;
  submitted_files?: Attachment[];
  submitted_at?: string;
  review_status?: ReviewStatus;
  feedback?: string;
}

export interface Task {
  _id?: string;
  id: string;
  title: string;
  content_html?: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_date?: string;
  due_date?: string;
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
  execution_result?: ExecutionResult;
  createdAt?: string;
  updatedAt?: string;
}
