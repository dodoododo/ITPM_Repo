# Frontend Communication System Guide

## Overview
This guide covers the frontend implementation of real-time comments, mentions, and typing indicators for tasks.

---

## Key Components

### TaskDetailPanel
**Location:** `src/components/tasks/TaskDetailPanel.tsx`

Main component that handles task comments and real-time communication.

**Features:**
- Comment composition and submission
- @mention parsing and autocomplete
- Real-time comment display
- Typing indicator display
- File attachment support

**Key Props:**
```typescript
interface TaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  projectId: string;
  users: User[];
  onUpdate?: (task: Task) => void;
}
```

**State Management:**
```typescript
// Comment-related state
const [comments, setComments] = useState<Comment[]>([]);
const [commentText, setCommentText] = useState('');
const [commentAttachments, setCommentAttachments] = useState<Attachment[]>([]);
const [isCommenting, setIsCommenting] = useState(false);

// Typing indicator state
const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

// Mention autocomplete state
const [mentionUsers, setMentionUsers] = useState<User[]>([]);
```

---

## Services

### Socket Service
**Location:** `src/services/socketService.ts`

Manages Socket.io connections for real-time updates.

**Functions:**

#### `connectTaskSocket(taskId, token, callbacks)`
Connects to a specific task room and sets up event listeners.

```typescript
const unsubscribe = connectTaskSocket(taskId, token, {
  onNewComment: (comment: Comment) => {
    // Handle new comment
  },
  onTyping: (data: { userId, userName, isTyping }) => {
    // Update typing indicator
  },
  onMention: (notification) => {
    // Handle mention notification
  },
});

// Cleanup
unsubscribe();
```

#### `emitTypingStatus(taskId, isTyping)`
Emits typing indicator to other users.

```typescript
// Start typing
emitTypingStatus(taskId, true);

// Stop typing
emitTypingStatus(taskId, false);
```

#### `connectNotificationSocket(token, onNotification)`
Connects to general notification room (for non-task notifications).

```typescript
connectNotificationSocket(token, (notification) => {
  // Handle notification
});
```

---

## Utilities

### Mention Parser
**Location:** `src/utils/mentionParser.ts`

Handles mention parsing, formatting, and rendering.

**Functions:**

#### `extractMentions(text): MentionMatch[]`
Extract all mention patterns from text.

```typescript
const mentions = extractMentions("Hi @John_Doe and @jane@example.com");
// [
//   { username: 'John_Doe', startIndex: 4, endIndex: 15 },
//   { username: 'jane@example.com', startIndex: 20, endIndex: 39 }
// ]
```

#### `parseMentionText(mentionText): string`
Convert mention text to display name.

```typescript
parseMentionText("John_Doe");        // "John Doe"
parseMentionText("jane@example.com"); // "jane@example.com"
```

#### `formatMentionUser(user): string`
Format user for mention insertion.

```typescript
const user = { full_name: "John Doe", email: "john@example.com" };
formatMentionUser(user); // "@John_Doe"
```

#### `getMentionSuggestions(query, users): User[]`
Get users matching mention query.

```typescript
const suggestions = getMentionSuggestions("john", allUsers);
// Returns users with 'john' in name or email
```

#### `renderMentionText(text, mentionedUsers): string`
Render text with highlighted mentions.

```typescript
const html = renderMentionText(
  "Great work @John_Doe!",
  [{ full_name: "John Doe", ... }]
);
// Returns HTML with highlighted mention
```

---

## Type Definitions

**Location:** `src/types/communication.types.ts`

```typescript
interface Comment {
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

interface Notification {
  _id?: string;
  id?: string;
  recipient_id: string | User;
  recipient?: User;
  sender_id?: string | User;
  sender?: User;
  type: 'mention' | 'task_comment' | 'task_assigned' | ...;
  title: string;
  body: string;
  link_to: string;
  is_read: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## UI Components

### Comment Display
```tsx
<div className="flex gap-3">
  <Avatar className="h-8 w-8">
    <AvatarImage src={sender?.avatar} />
    <AvatarFallback>{sender?.full_name?.[0]}</AvatarFallback>
  </Avatar>
  <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-sm font-medium">{sender?.full_name}</span>
      <span className="text-[10px] text-slate-500">
        {new Date(comment.createdAt).toLocaleString('vi-VN')}
      </span>
    </div>
    <p className="whitespace-pre-wrap text-sm">{comment.text}</p>
    {comment.attachments?.map(file => (
      <a href={file.file_url} key={file.file_url} target="_blank">
        📎 {file.file_name}
      </a>
    ))}
  </div>
</div>
```

### Typing Indicator
```tsx
{typingUsers.size > 0 && (
  <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs border border-blue-200">
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" 
             style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"
             style={{ animationDelay: '300ms' }} />
      </div>
      <span>
        {Array.from(typingUsers.values()).join(', ')} dang gap...
      </span>
    </div>
  </div>
)}
```

### Mention Menu
```tsx
{mentionUsers.length > 0 && (
  <div className="absolute bottom-full left-0 z-20 mb-1 w-64 rounded-md 
                  border bg-white shadow-lg">
    {mentionUsers.map((user) => (
      <button
        key={user.id}
        onClick={() => insertMention(user)}
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50"
      >
        <Avatar className="h-6 w-6">
          <AvatarImage src={user.avatar} />
          <AvatarFallback>{user.full_name[0]}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {user.full_name}
          </span>
          <span className="block truncate text-xs text-slate-500">
            {user.email}
          </span>
        </span>
      </button>
    ))}
  </div>
)}
```

### Comment Textarea
```tsx
<Textarea
  value={commentText}
  onChange={(event) => {
    const newText = event.target.value;
    setCommentText(newText);
    // Emit typing indicator
    emitTypingStatus(taskId, newText.trim().length > 0);
  }}
  onBlur={() => {
    // Stop typing when leaving
    emitTypingStatus(taskId, false);
  }}
  placeholder="Nhap binh luan, dung @ de tag thanh vien..."
  rows={3}
/>
```

---

## Event Flow

### Creating a Comment
```
User types @mention
    ↓
Input changed → emit typing status
    ↓
Mention menu appears (filtered suggestions)
    ↓
User clicks mention → insert into text
    ↓
User clicks Send
    ↓
submitComment() called
    ↓
emitTypingStatus(false) → stop typing
    ↓
taskService.createComment() → POST to backend
    ↓
Response with comment data
    ↓
Add to comments list (optimistic update)
    ↓
Clear input & attachments
```

### Receiving Comment Update
```
Server broadcasts new_comment event
    ↓
Socket listener triggered: onNewComment()
    ↓
setComments(prev => [...prev, newComment])
    ↓
Component re-renders
    ↓
New comment appears in UI
```

### Typing Indicator Flow
```
User starts typing
    ↓
onChange fires
    ↓
emitTypingStatus(taskId, true)
    ↓
Socket emits 'typing' event
    ↓
Server broadcasts 'user_typing' to room
    ↓
Other clients receive 'user_typing' event
    ↓
onTyping() callback updates typingUsers state
    ↓
"John is typing..." indicator appears
    ↓
Auto-hide after 3 seconds or user stops
```

---

## Best Practices

### Performance
1. **Debounce Typing**: Use `onBlur` to stop typing status
2. **Pagination**: Load comments in batches, not all at once
3. **Memoization**: Use `useMemo` for user maps and mention filters
4. **Cleanup**: Always unsubscribe from socket in useEffect cleanup

### UX
1. **Optimistic Updates**: Add comment to UI immediately
2. **Visual Feedback**: Show loading states for uploads
3. **Error Handling**: Display user-friendly error messages
4. **Accessibility**: Use semantic HTML and ARIA labels

### Security
1. **Token Validation**: Verify token in socket auth
2. **XSS Prevention**: Sanitize comment text in rendering
3. **Permission Checks**: Verify user can access task
4. **Rate Limiting**: Limit comment submission frequency

---

## Common Issues & Solutions

### Comments not appearing
**Problem:** New comments don't show up in real-time

**Solutions:**
1. Check Socket.io connection: `console.log(socket.connected)`
2. Verify task room join: Check Network tab for `join_task` event
3. Check socket errors in console
4. Verify backend is emitting `new_comment` events

### Typing indicator stuck
**Problem:** "X is typing..." stays on screen

**Solutions:**
1. Check cleanup in useEffect
2. Verify onBlur handler triggers
3. Check typing timeout is clearing properly
4. Use DevTools to inspect typingUsers state

### Mentions not working
**Problem:** @mentions don't create suggestions

**Solutions:**
1. Check mention format: `@Username_with_underscores`
2. Verify users array is populated
3. Debug regex: `/@[\p{L}\p{N}_.-]*$/u`
4. Check mention query in state

### File attachments failing
**Problem:** Attachment upload fails

**Solutions:**
1. Check file size (max 10MB)
2. Verify MIME type is allowed
3. Check upload endpoint returns correct URL
4. Verify file attachment object structure

---

## Testing Guide

### Unit Tests
```typescript
import { renderMentionText, extractMentions } from '@/utils/mentionParser';

describe('Mention Parser', () => {
  it('extracts mentions from text', () => {
    const text = "Hi @John_Doe";
    const mentions = extractMentions(text);
    expect(mentions).toHaveLength(1);
    expect(mentions[0].username).toBe('John_Doe');
  });

  it('renders mention highlights', () => {
    const html = renderMentionText("Hi @John_Doe", [
      { full_name: "John Doe", email: "john@example.com" }
    ]);
    expect(html).toContain('mention-highlight');
  });
});
```

### Integration Tests
```typescript
describe('Task Comments', () => {
  it('creates and displays comment in real-time', async () => {
    // 1. Open task
    // 2. Type comment with mention
    // 3. Submit
    // 4. Verify comment appears in list
    // 5. Verify mentioned user receives notification
  });

  it('shows typing indicator for other users', async () => {
    // 1. Open task in two browser windows
    // 2. Start typing in first window
    // 3. Verify indicator shows in second window
    // 4. Verify indicator hides after 3 seconds
  });
});
```

---

## Environment Configuration

**Required Environment Variables:**
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

**Socket.io Configuration:**
- Transport: `['websocket', 'polling']`
- Reconnection: Automatic with exponential backoff
- Auth: Bearer token in socket auth

---

## Related Documentation
- [Backend Communication System](../backend/src/utils/COMMUNICATION_SYSTEM.md)
- [Socket Service](../services/socketService.ts)
- [Task Types](../types/communication.types.ts)
