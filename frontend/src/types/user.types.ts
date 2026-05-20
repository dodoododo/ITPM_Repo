/**
 * User & Authentication Types
 * Phân hệ: NHÂN SỰ & PHÂN QUYỀN
 */

export type UserRole = 'admin' | 'manager' | 'employee' | 'Administrator' | 'Leader' | 'Developer' | 'Designer';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export interface User {
  _id?: string;
  id: string;
  full_name: string;
  email: string;
  password?: string; // Không truyền qua API response
  avatar?: string;
  role?: UserRole;
  isActive?: boolean;
  invitationStatus?: InvitationStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Invitation {
  _id?: string;
  id?: string;
  email: string;
  token: string;
  role: UserRole;
  department_id?: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  _id?: string;
  id: string;
  name: string;
  description?: string;
  color?: string;
  member_ids?: Array<string | User>;
  member_count?: number;
  members?: User[];
  createdAt?: string;
  updatedAt?: string;
}
