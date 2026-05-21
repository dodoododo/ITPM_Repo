# Frontend Types Structure

## 📂 Directory Organization

Types được tổ chức thành các file riêng theo từng phân hệ (domain), giúp code dễ maintain và tránh file quá lớn.

```
src/types/
├── index.ts                    # Re-exports từ tất cả files
├── user.types.ts              # User, Department, Invitation
├── project.types.ts           # Project
├── task.types.ts              # Task, Subtask, Attachment, ExecutionResult
├── communication.types.ts      # Comment, Notification, Message, Conversation
├── activity.types.ts          # ActivityLog
├── api.types.ts               # API Response types
├── ui.types.ts                # UI Helper types
└── README.md                  # File này
```

---

## 🎯 Cách Sử Dụng

### 1. Import từ Index (Recommended cho phần lớn cases)

```typescript
import { User, Project, Task } from '@/types';
import { ApiResponse, PaginatedResponse } from '@/types';
```

### 2. Import từ File Cụ Thể (Khi cần types từ một domain)

```typescript
// Từ user.types.ts
import type { User, Department, UserRole } from '@/types/user.types';

// Từ task.types.ts
import type { Task, TaskStatus, TaskPriority } from '@/types/task.types';

// Từ communication.types.ts
import type { Comment, Notification } from '@/types/communication.types';
```

### 3. Import All Types (Nếu cần)

```typescript
import * as Types from '@/types';

const user: Types.User = { ... };
```

---

## 📋 Phân Chia Chi Tiết

### `user.types.ts` - Nhân Sự & Phân Quyền
- `UserRole` - Enum: admin | manager | employee
- `InvitationStatus` - Enum: pending | accepted | expired
- `User` - Interface
- `Invitation` - Interface
- `Department` - Interface

### `project.types.ts` - Dự Án
- `ProjectStatus` - Enum: planning | active | on_hold | completed
- `Project` - Interface

### `task.types.ts` - Công Việc
- `TaskStatus` - Enum: todo | in_progress | review | done
- `TaskPriority` - Enum: low | medium | high | urgent
- `ReviewStatus` - Enum: pending | approved | rejected
- `Attachment` - Interface
- `Subtask` - Interface
- `ExecutionResult` - Interface
- `Task` - Interface (Bảng phức tạp nhất)

### `communication.types.ts` - Giao Tiếp
- `NotificationType` - Enum (7 loại notification)
- `Comment` - Interface
- `Notification` - Interface
- `Conversation` - Interface
- `Message` - Interface
- `LastMessage` - Interface

### `activity.types.ts` - Log Hệ Thống
- `ActivityTargetType` - Enum: Project | Task | Department | User
- `ActivityLog` - Interface

### `api.types.ts` - API Responses
- `ApiResponse<T>` - Generic interface cho API response
- `PaginatedResponse<T>` - Cho list APIs
- `KanbanResponse` - Specialized cho Kanban board

### `ui.types.ts` - UI Helpers
- `TaskComment` - UI model cho comment display
- `DraggingState` - Untuk Drag & Drop
- `AppContextType` - AppContext type definition

---

## ✅ Best Practices

### DO ✅
```typescript
// Import từ file cụ thể khi chỉ cần một domain
import type { Task, TaskStatus } from '@/types/task.types';

// Re-export types từ index nếu component dùng nhiều types
import type { User, Project, Task, Comment } from '@/types';

// Dùng `type` keyword để tree-shake tốt hơn
import type { ApiResponse } from '@/types';
```

### DON'T ❌
```typescript
// Không import implementations (chỉ import types)
import User from '@/types'; // ❌ Sai

// Không mix imports từ nhiều files nếu index có
import { User } from '@/types/user.types';
import { Project } from '@/types/project.types';
import { Task } from '@/types/task.types'; // ❌ Dùng index thay vì
```

---

## 🔄 Dependency Diagram

```
user.types.ts
  ↓
project.types.ts (imports User, Department)
  ↓
task.types.ts (imports User, Project)
  ↓
communication.types.ts (imports User, Attachment)
  ↓
activity.types.ts (imports User)
  ↓
api.types.ts (imports Task)
  ↓
ui.types.ts (imports Department)
  ↓
index.ts (re-exports all)
```

---

## 🎓 Ví Dụ Component Usage

```typescript
// In frontend/src/components/tasks/TaskDetail.tsx
import type { Task, Comment } from '@/types';
import type { ApiResponse } from '@/types';

interface TaskDetailProps {
  task: Task;
  comments: Comment[];
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, comments }) => {
  const handleSubmit = async (): Promise<ApiResponse<Task>> => {
    const response = await api.patch(`/tasks/${task.id}`);
    return response;
  };

  return (
    <div>
      <h1>{task.title}</h1>
      <p>Status: {task.status}</p>
      {/* ... */}
    </div>
  );
};
```

---

## 📝 Adding New Types

Khi cần thêm types mới:

1. **Xác định domain** nó thuộc về (User, Project, Task, Communication, Activity, API, UI)
2. **Thêm vào file tương ứng**
3. **Update index.ts** để re-export type mới
4. **Không create file mới** nếu type chỉ 1-2 cái, thêm vào file domain sẵn có

---

✨ **Types are now properly organized and maintainable!** ✨
