/**
 * ============================================================================
 * TYPES INDEX - Re-exports all types from individual type files
 * ============================================================================
 * 
 * Import strategy:
 * 1. For specific types: import { User, Department } from '@/types/user.types'
 * 2. For all types:     import * as Types from '@/types'
 * 3. From index:        import { User, Department } from '@/types'
 */

// --- USER & AUTHENTICATION TYPES ---
export type { UserRole, InvitationStatus } from './user.types';
export type { User, Invitation, Department } from './user.types';

// --- PROJECT TYPES ---
export type { ProjectStatus } from './project.types';
export type { Project } from './project.types';

// --- TASK TYPES ---
export type { TaskStatus, TaskPriority, Priority, ReviewStatus } from './task.types';
export type { Attachment, Subtask, ExecutionResult, Task } from './task.types';

// --- COMMUNICATION TYPES ---
export type { NotificationType } from './communication.types';
export type { Comment, Notification, LastMessage, Conversation, Message } from './communication.types';

// --- ACTIVITY LOG TYPES ---
export type { ActivityTargetType } from './activity.types';
export type { ActivityLog } from './activity.types';

// --- API RESPONSE TYPES ---
export type { ApiResponse, PaginatedResponse, KanbanResponse } from './api.types';

// --- UI HELPER TYPES ---
export type { TaskComment, DraggingState, AppContextType } from './ui.types';
