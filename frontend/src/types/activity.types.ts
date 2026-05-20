/**
 * Activity Log Types
 * Phân hệ: LOG HỆ THỐNG
 */

import type { User } from './user.types';

export type ActivityTargetType = 'Project' | 'Task' | 'Department' | 'User';

export interface ActivityLog {
  _id?: string;
  id?: string;
  user_id: string;
  user?: User;
  action: string;
  target_type: ActivityTargetType;
  target_id: string;
  details?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}
