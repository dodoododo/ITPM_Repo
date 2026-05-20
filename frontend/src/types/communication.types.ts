/**
 * Communication Types
 * Phân hệ: GIAO TIẾP & TRUYỀN THÔNG
 */

import type { User } from './user.types';
import type { Attachment } from './task.types';

export type NotificationType = 'task_assigned' | 'task_comment' | 'review_requested' | 'review_approved' | 'review_rejected' | 'mention' | 'system';

export interface Comment {
  _id?: string;
  id?: string;
  task_id: string;
  sender_id: string | User;
  sender?: User;
  text: string;
  attachments?: Attachment[];
  mentions?: Array<string | User>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  _id?: string;
  id?: string;
  recipient_id: string | User;
  recipient?: User;
  sender_id?: string | User;
  sender?: User;
  type: NotificationType;
  title: string;
  body: string;
  link_to: string;
  is_read: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LastMessage {
  text?: string;
  sender_id?: string;
  sent_at?: string;
}

export interface Conversation {
  _id?: string;
  id?: string;
  name?: string;
  is_group: boolean;
  project_id?: string;
  department_id?: string;
  member_ids?: string[];
  members?: User[];
  last_message?: LastMessage;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  _id?: string;
  id?: string;
  conversation_id: string;
  sender_id: string;
  sender?: User;
  text?: string;
  attachments?: Attachment[];
  read_by?: string[];
  createdAt?: string;
  updatedAt?: string;
}
