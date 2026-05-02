// src/types/schema.ts

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus; // Dùng enum thay vì string
  priority: Priority; // Bắt buộc phải có
  assignee_id?: string;
  reviewer_id?: string;
  start_date?: string;
  due_date?: string;
  subtasks?: Subtask[];
}

export interface User {
  id: string;
  full_name?: string;
  email: string;
  avatar?: string;
}