export type UserRole = 'admin' | 'manager' | 'employee' | 'Administrator' | 'Leader' | 'Developer' | 'Designer';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';
export type AccountStatus = 'pending' | 'active' | 'locked' | 'disabled';

export interface User {
  _id?: string;
  id: string;
  full_name: string;
  email: string;
  company_email?: string;
  notification_email?: string;
  password?: string;
  avatar?: string;
  role?: UserRole;
  isActive?: boolean;
  account_status?: AccountStatus;
  invitationStatus?: InvitationStatus;
  hasChangedPassword?: boolean;
  mustChangePassword?: boolean;
  department_id?: string | Department;
  position_title?: string;
  manager_id?: string | User;
  created_by?: string | User;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Invitation {
  _id?: string;
  id?: string;
  email: string;
  token: string;
  role: UserRole;
  department_id?: string | Department;
  user_id?: string | User;
  created_by?: string | User;
  sentAt?: string;
  lastSendError?: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  _id?: string;
  id: string;
  name: string;
  code?: string;
  description?: string;
  color?: string;
  manager_id?: string | User;
  managerId?: string | User;
  member_ids?: Array<string | User>;
  member_count?: number;
  members?: User[];
  createdAt?: string;
  updatedAt?: string;
}
