# Communication System Implementation Guide

## Overview
This guide documents the implementation of the real-time communication system for the ITPM application, including comments, mentions, and typing indicators.

---

## Features Implemented

### 1. **Comments in Tasks** (US-CM01 - Part)
- ✅ Users can add comments directly to tasks
- ✅ Comments support file attachments
- ✅ Comments are displayed in real-time across all connected users
- ✅ Comment history is loaded on task open

**Files:**
- Backend: `backend/src/routes/task.routes.js` - Comment creation/retrieval endpoints
- Frontend: `frontend/src/components/tasks/TaskDetailPanel.tsx` - Comment UI

---

### 2. **@Mentions System** (US-CM01)
- ✅ Frontend parses text to detect `@username` patterns
- ✅ Shows autocomplete suggestions while typing
- ✅ Highlighted mention menu with user avatars
- ✅ Backend extracts mentioned users and stores them
- ✅ Mentioned users receive instant notifications

**Patterns Supported:**
- `@John_Doe` - Name with underscores
- `@john@example.com` - Email address
- `@123abc...` - User ID

**Files:**
- Backend Utilities: `backend/src/utils/mentionParser.js`
- Backend Routes: `backend/src/routes/task.routes.js` (lines 394-450)
- Frontend Utilities: `frontend/src/utils/mentionParser.ts`
- Frontend Component: `frontend/src/components/tasks/TaskDetailPanel.tsx`

---

### 3. **Real-time Typing Indicator** (US-CM02 - Part)
- ✅ Shows "X is typing..." indicator when users compose comments
- ✅ Emits typing status via Socket.io
- ✅ Auto-hides after 3 seconds of inactivity
- ✅ Displays animated dots for visual feedback

**UI Component:**
```tsx
{typingUsers.size > 0 && (
  <div className="typing-indicator">
    <div className="animate-bounce" />
    {Array.from(typingUsers.values()).join(', ')} dang gap...
  </div>
)}
```

**Files:**
- Frontend Service: `frontend/src/services/socketService.ts`
- Frontend Component: `frontend/src/components/tasks/TaskDetailPanel.tsx`

---

### 4. **Real-time Notifications** (US-CM02 - Part)
- ✅ New comments broadcast to all task room members
- ✅ Mention notifications sent to mentioned users
- ✅ Bell notification indicator with sound (optional)
- ✅ Notification persistence in database

**Broadcast Events:**
```javascript
// Broadcast new comment to task room
broadcastNewComment(taskId, commentData);

// Emit mention notification
emitMentionNotification(userIds, notification);

// Room-based broadcast
broadcastCommentNotification(taskId, notification);
```

**Files:**
- Backend Socket: `backend/src/utils/socket.js`
- Backend Routes: `backend/src/routes/task.routes.js`
- Frontend Socket Service: `frontend/src/services/socketService.ts`

---

## Architecture

### Backend Flow

```
┌─────────────┐
│   Client    │
│  (Comment)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│ POST /api/tasks/:taskId/comments            │
├─────────────────────────────────────────────┤
│ 1. Authenticate user                        │
│ 2. Validate comment content                 │
│ 3. Extract mentions via extractMentionedUsers│
│ 4. Create Comment document                  │
│ 5. Broadcast via Socket.io                  │
│    a. broadcastNewComment (to task room)    │
│    b. emitMentionNotification (to @users)   │
│ 6. Create Notification records              │
│ 7. Return populated comment                 │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ Socket.io Events                   │
├────────────────────────────────────┤
│ • new_comment                      │
│ • new_notification                 │
│ • user_typing                      │
│ • task_comment_notification        │
└────────────────────────────────────┘
```

### Frontend Flow

```
┌──────────────────────────────────────┐
│  TaskDetailPanel Component           │
├──────────────────────────────────────┤
│ 1. Load task comments               │
│ 2. Connect to task Socket room      │
│ 3. Listen for real-time events:    │
│    a. onNewComment()                │
│    b. onTyping()                    │
│    c. onMention()                   │
│ 4. Handle comment input:            │
│    a. Parse @mentions              │
│    b. Emit typing status           │
│    c. Submit and clear             │
│ 5. Render comments + indicators    │
└──────────────────────────────────────┘
```

---

## API Endpoints

### Get Comments
```http
GET /api/tasks/:taskId/comments
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "task_id": "...",
      "sender_id": { ...User },
      "text": "Great work! @John_Doe check this",
      "mentions": [ { ...User }, ... ],
      "attachments": [ ... ],
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Create Comment
```http
POST /api/tasks/:taskId/comments
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "text": "Well done! @Jane_Smith can you review?",
  "attachments": [
    {
      "file_name": "document.pdf",
      "file_url": "https://...",
      "file_type": "pdf",
      "size": 1024000
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "task_id": "...",
    "sender_id": { ...User },
    "text": "Well done! @Jane_Smith can you review?",
    "mentions": [ { ...Jane_Smith User Object } ],
    "attachments": [ ... ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## Socket.io Events

### Client → Server

#### Join Task Room
```javascript
socket.emit('join_task', taskId);
```

#### Leave Task Room
```javascript
socket.emit('leave_task', taskId);
```

#### Typing Status
```javascript
// User starts typing
socket.emit('typing', { taskId, isTyping: true });

// User stops typing
socket.emit('stop_typing', taskId);
```

### Server → Client

#### New Comment Broadcast
```javascript
socket.on('new_comment', (comment) => {
  // comment: { _id, task_id, sender_id, text, mentions, attachments, ... }
  setComments(prev => [...prev, comment]);
});
```

#### Typing Indicator
```javascript
socket.on('user_typing', (data) => {
  // data: { userId, userName, isTyping: true/false, taskId }
  if (data.isTyping) {
    showTypingIndicator(data.userName);
  } else {
    hideTypingIndicator(data.userId);
  }
});
```

#### Mention Notification
```javascript
socket.on('task_comment_notification', (notification) => {
  // notification: { type, title, body, link_to, ... }
  showNotificationBell();
  playNotificationSound();
});
```

#### New Notification
```javascript
socket.on('new_notification', (notification) => {
  // Received mention notification
  addNotification(notification);
});
```

---

## Usage Examples

### Frontend: Setting up Real-time Comments

```typescript
import { connectTaskSocket, emitTypingStatus } from '@/services/socketService';

// In component
useEffect(() => {
  if (!taskId || !token) return;

  const unsubscribe = connectTaskSocket(taskId, token, {
    onNewComment: (comment) => {
      setComments(prev => [...prev, comment]);
    },
    onTyping: (data) => {
      if (data.isTyping) {
        setTypingUsers(prev => new Map(prev).set(data.userId, data.userName));
      } else {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }
    },
    onMention: () => {
      playNotificationSound();
    },
  });

  return unsubscribe;
}, [taskId, token]);

// Emit typing status on input change
const handleCommentChange = (text) => {
  setCommentText(text);
  emitTypingStatus(taskId, text.trim().length > 0);
};
```

### Backend: Using Mention Utilities

```javascript
const { extractMentionedUsers, createMentionNotificationPayload } = require("../utils/mentionParser");

// Extract mentions
const mentionedUsers = await extractMentionedUsers(commentText);

// Create notifications
const notifications = createMentionNotificationPayload({
  mentionedUsers,
  senderId: req.user.userId,
  text: commentText,
  taskId,
  projectId,
});

// Save and broadcast
await createNotifications(notifications);
broadcastNewComment(taskId, comment);
emitMentionNotification(mentionedUsers.map(u => u._id), notification);
```

---

## Database Models

### Comment Model
```javascript
{
  task_id: ObjectId,          // Reference to Task
  sender_id: ObjectId,        // Reference to User
  text: String,              // Comment content
  attachments: [{            // File attachments
    file_name: String,
    file_url: String,
    file_type: String,
    size: Number
  }],
  mentions: [ObjectId],      // Array of mentioned User IDs
  createdAt: Date,
  updatedAt: Date
}
```

### Notification Model
```javascript
{
  recipient_id: ObjectId,    // Who receives the notification
  sender_id: ObjectId,       // Who sent it (optional)
  type: String,              // 'mention', 'task_comment', etc.
  title: String,             // Notification title
  body: String,              // Notification body/preview
  link_to: String,          // Deep link to task
  is_read: Boolean,         // Read status
  createdAt: Date,
  updatedAt: Date
}
```

---

## Testing Checklist

- [ ] Create comment in task
- [ ] Comment appears in real-time for all connected users
- [ ] Typing indicator shows when user starts typing
- [ ] Typing indicator hides after 3 seconds
- [ ] @mention autocomplete works
- [ ] @mentioned user receives notification
- [ ] Comment with attachment uploads successfully
- [ ] Mention highlights in comment history
- [ ] New comment count updates in real-time
- [ ] Disconnected users reconnect properly

---

## Performance Considerations

1. **Socket.io Room-based Broadcasting**: Comments broadcast only to task room, not all users
2. **Mention Extraction**: Done once on backend per comment
3. **Typing Indicator Debounce**: Auto-hides after 3 seconds to reduce socket traffic
4. **Comment History**: Paginated load (limit 100 comments initially)
5. **Notification Indexing**: Database indexes on `recipient_id` and `is_read`

---

## Future Enhancements

1. **Comment Editing/Deletion**
   - Add edit history
   - Soft delete with tombstone

2. **Reaction System**
   - Emoji reactions to comments
   - Real-time reaction count

3. **Comment Threads**
   - Reply to specific comments
   - Thread notifications

4. **Rich Text Editor**
   - Markdown support
   - Code blocks with syntax highlighting

5. **Mention Notifications**
   - Sound customization
   - Desktop notifications
   - Email digest option

---

## Troubleshooting

### Comments not showing in real-time
1. Check Socket.io connection status
2. Verify task room join event is emitted
3. Check browser console for socket errors
4. Verify backend is broadcasting events

### Typing indicator stuck
1. Check for console errors
2. Verify onBlur event fires
3. Check typing timeout cleanup in useEffect

### Mentions not recognized
1. Check mention format: `@Username_with_underscores`
2. Verify user exists in database
3. Check extractMentionedUsers regex pattern
4. Test with direct email mention

---

## Related Files
- [Backend Models](../models/README.md)
- [Frontend Types](../../frontend/src/types/communication.types.ts)
- [Socket Configuration](../utils/socket.js)
- [Task Routes](../routes/task.routes.js)
