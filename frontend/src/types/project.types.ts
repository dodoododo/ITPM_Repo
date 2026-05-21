/**
 * Project Types
 * Phân hệ: LÕI CÔNG VIỆC
 */

import type { User, Department } from './user.types';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';
export type ProjectVisibility = 'public' | 'private';

export interface Project {
  _id?: string;
  id: string;
  name: string;
  description?: string;
  color?: string;
  status: ProjectStatus;
  visibility?: ProjectVisibility;
  progress: number;
  start_date?: string;
  end_date?: string;
  department_id?: string | Department;
  department?: Department;
  owner_id?: string | User;
  owner?: User;
  member_ids?: Array<string | User>;
  members?: User[];
  createdAt?: string;
  updatedAt?: string;
}
