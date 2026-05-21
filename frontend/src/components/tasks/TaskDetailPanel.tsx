import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CheckSquare, Download, Eye, FileText, Link2, Loader2, MessageSquare, Paperclip, Save, Send, UploadCloud, X, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { taskService } from '@/services/taskService';
import { connectTaskSocket, emitTypingStatus } from '@/services/socketService';
import RichTextEditor from '@/components/tasks/RichTextEditor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type Attachment, type Comment, type Priority, type Subtask, type Task, type TaskStatus, type User } from '@/types';

interface TaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  projectId: string;
  users: User[];
  onUpdate?: (task: Task) => void;
}

interface TaskFields {
  assignee_id: string;
  reviewer_id: string;
  priority: Priority;
  group_key: string;
  group_name: string;
  kpi_weight: string;
  start_date: string;
  due_date: string;
  status: TaskStatus;
}

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Pending Review' },
  { value: 'needs_revision', label: 'Needs Revision' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: 'low', label: 'Thap' },
  { value: 'medium', label: 'Trung binh' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khan cap' },
];

const getEntityId = (value?: string | { _id?: string; id?: string }) => (
  typeof value === 'string' ? value : value?._id || value?.id || ''
);

const getUserId = (user: User) => getEntityId(user);

const getDependencyIds = (task: Task) => {
  const values = task.dependency_ids?.length ? task.dependency_ids : task.dependencies || [];
  return values.map(getEntityId).filter(Boolean);
};

const toDateInput = (value?: string) => {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
};

export default function TaskDetailPanel({ task, open, onClose, projectId, users = [], onUpdate }: TaskDetailPanelProps) {
  const { token, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<TaskFields>({
    assignee_id: 'none',
    reviewer_id: 'none',
    priority: 'medium',
    group_key: 'general',
    group_name: 'Chung',
    kpi_weight: '',
    start_date: '',
    due_date: '',
    status: 'todo',
  });
  const [contentHtml, setContentHtml] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dependencyOptions, setDependencyOptions] = useState<Task[]>([]);
  const [selectedDependencyIds, setSelectedDependencyIds] = useState<string[]>([]);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<Attachment[]>([]);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isCommentUploading, setIsCommentUploading] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitNote, setSubmitNote] = useState('');
  const [submitFiles, setSubmitFiles] = useState<Attachment[]>([]);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reassignAssigneeId, setReassignAssigneeId] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const isPostingCommentRef = useRef(false);

  useEffect(() => {
    if (!task) return;
    setFields({
      assignee_id: task.assignee_id || 'none',
      reviewer_id: task.reviewer_id || 'none',
      priority: task.priority || 'medium',
      group_key: task.group_key || 'general',
      group_name: task.group_name || 'Chung',
      kpi_weight: task.kpi_weight ? String(task.kpi_weight) : '',
      start_date: toDateInput(task.start_date),
      due_date: toDateInput(task.due_date),
      status: task.status || 'todo',
    });
    setContentHtml(task.content_html || task.description || '');
    setAttachments(task.attachments || []);
    setSelectedDependencyIds(getDependencyIds(task));
    setSubtaskTitle('');
    setCommentText('');
    setCommentAttachments([]);
    setSubmitNote('');
    setSubmitFiles([]);
    setRejectFeedback('');
    setReassignAssigneeId('');
    setPreviewAttachment(null);
    setShowSubmitDialog(false);
    setShowRejectDialog(false);
    setError('');
  }, [task?.id]);

  useEffect(() => {
    if (!token || !open || !task?.id) return;
    void loadComments(task.id);

    // Connect to task socket room for real-time updates
    const taskId = task.id || task._id || '';
    const unsubscribe = connectTaskSocket(taskId, token, {
      onNewComment: (comment: Comment) => {
        upsertComment(comment);
      },
      onTyping: (data: { userId: string; userName: string; isTyping: boolean }) => {
        setTypingUsers((current) => {
          const next = new Map(current);
          if (data.isTyping) {
            next.set(data.userId, data.userName);
            // Auto-remove typing indicator after 3 seconds
            if (typingTimeoutRef.current[data.userId]) {
              clearTimeout(typingTimeoutRef.current[data.userId]);
            }
            typingTimeoutRef.current[data.userId] = setTimeout(() => {
              setTypingUsers((prev) => {
                const updated = new Map(prev);
                updated.delete(data.userId);
                return updated;
              });
            }, 3000);
          } else {
            next.delete(data.userId);
            if (typingTimeoutRef.current[data.userId]) {
              clearTimeout(typingTimeoutRef.current[data.userId]);
            }
          }
          return next;
        });
      },
      onMention: () => {
        // Optional: show notification toast or ring bell
        // Play notification sound if available
        const audio = new Audio('data:audio/wav;base64,UklGRkYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=');
        audio.play().catch(() => {});
      },
    });

    return () => {
      unsubscribe?.();
      Object.values(typingTimeoutRef.current).forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current = {};
    };
  }, [token, open, task?.id]);

  useEffect(() => {
    if (!token || !open || !projectId || !task?.id) return;

    let cancelled = false;
    const currentTaskId = task.id || task._id || '';

    const loadDependencyOptions = async () => {
      try {
        setIsLoadingDependencies(true);
        const tasks = await taskService.getProjectTasks(projectId, token);
        if (!cancelled) {
          setDependencyOptions(tasks.filter((item) => (item.id || item._id || '') !== currentTaskId));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dependencies');
      } finally {
        if (!cancelled) setIsLoadingDependencies(false);
      }
    };

    void loadDependencyOptions();

    return () => {
      cancelled = true;
    };
  }, [token, open, projectId, task?.id]);

  const userMap = useMemo(() => (
    new Map(users.map((user) => [getUserId(user), user]))
  ), [users]);

  if (!task) return null;

  const assignee = fields.assignee_id !== 'none' ? userMap.get(fields.assignee_id) || task.assignee || null : null;
  const reviewer = fields.reviewer_id !== 'none' ? userMap.get(fields.reviewer_id) : null;
  const currentUserId = user?._id || user?.id || (token ? (() => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      return payload.userId as string;
    } catch {
      return '';
    }
  })() : '');
  const canManageTaskFields = user?.role === 'admin' || user?.role === 'manager';
  const activeAssignableUsers = users.filter((item) => (
    item.isActive !== false
    && getUserId(item)
    && getUserId(item) !== fields.assignee_id
  ));
  const isOrphanedTask = Boolean(
    task.assignee_id
    && assignee?.isActive === false
    && (task.status === 'todo' || task.status === 'in_progress')
  );
  const canSubmitResult = Boolean(task.assignee_id && task.assignee_id === currentUserId && ['in_progress', 'needs_revision'].includes(task.status));
  const canReviewResult = Boolean(
    task.status === 'review'
    && (
      user?.role === 'manager'
      || (user?.role === 'admin' && task.reviewer_id === currentUserId)
    )
  );
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((subtask) => subtask.done || subtask.isDone || subtask.is_completed).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;
  const visibleDependencyOptions = canManageTaskFields
    ? dependencyOptions
    : dependencyOptions.filter((dependency) => selectedDependencyIds.includes(dependency.id || dependency._id || ''));
  const mentionQuery = (commentText.match(/@([\p{L}\p{N}_.-]*)$/u)?.[1] || '').toLowerCase();
  const showMentionMenu = /@[\p{L}\p{N}_.-]*$/u.test(commentText);
  const mentionUsers = showMentionMenu
    ? users.filter((user) => (
      user.full_name.toLowerCase().includes(mentionQuery)
      || user.email.toLowerCase().includes(mentionQuery)
    )).slice(0, 6)
    : [];

  const updateLocal = (updated: Task) => {
    onUpdate?.(updated);
  };

  const loadComments = async (taskId: string) => {
    if (!token) return;
    try {
      setComments(await taskService.getComments(taskId, token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    }
  };

  const saveTaskFields = async () => {
    if (!token) return;

    try {
      setIsSaving(true);
      setError('');
      const response = await taskService.updateTask(task.id, {
        assignee_id: fields.assignee_id === 'none' ? '' : fields.assignee_id,
        reviewer_id: fields.reviewer_id === 'none' ? '' : fields.reviewer_id,
        priority: fields.priority,
        group_key: fields.group_key.trim() || 'general',
        group_name: fields.group_name.trim() || 'Chung',
        kpi_weight: Number(fields.kpi_weight) || 0,
        start_date: fields.start_date,
        due_date: fields.due_date,
        status: fields.status,
        dependency_ids: selectedDependencyIds,
      }, token);
      if (response.data) updateLocal(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setIsSaving(false);
    }
  };

  const saveDetails = async (nextAttachments = attachments) => {
    if (!token) return;

    try {
      setIsSaving(true);
      setError('');
      const response = await taskService.updateDetails(task.id, {
        content_html: contentHtml,
        attachments: nextAttachments,
      }, token);
      if (response.data) updateLocal(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!token) return;

    try {
      setIsUploading(true);
      setError('');
      const uploaded = await Promise.all(Array.from(files).map((file) => taskService.uploadFile(file, token)));
      const nextAttachments = [...attachments, ...uploaded];
      setAttachments(nextAttachments);
      await saveDetails(nextAttachments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = async (fileUrl: string) => {
    const nextAttachments = attachments.filter((attachment) => attachment.file_url !== fileUrl);
    setAttachments(nextAttachments);
    await saveDetails(nextAttachments);
  };

  const handleSubmitFiles = async (files: FileList | File[]) => {
    if (!token) return;
    try {
      setIsUploading(true);
      const uploaded = await Promise.all(Array.from(files).map((file) => taskService.uploadFile(file, token)));
      setSubmitFiles((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload result file');
    } finally {
      setIsUploading(false);
    }
  };

  const submitResult = async () => {
    if (!token) return;
    if (!submitNote.trim()) {
      setError('Can nhap ghi chu nghiem thu truoc khi gui');
      return;
    }

    try {
      setIsSubmittingResult(true);
      setError('');
      const response = await taskService.submitResult(task.id, {
        note: submitNote.trim(),
        submitted_files: submitFiles,
      }, token);
      if (response.data) updateLocal(response.data);
      setShowSubmitDialog(false);
      setSubmitNote('');
      setSubmitFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit result');
    } finally {
      setIsSubmittingResult(false);
    }
  };

  const reviewResult = async (action: 'approve' | 'reject') => {
    if (!token) return;
    try {
      setIsReviewing(true);
      setError('');
      const response = await taskService.reviewResult(task.id, {
        action,
        feedback_note: action === 'reject' ? rejectFeedback : '',
        rejectReason: action === 'reject' ? rejectFeedback : undefined,
      }, token);
      if (response.data) updateLocal(response.data);
      setShowRejectDialog(false);
      setRejectFeedback('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review result');
    } finally {
      setIsReviewing(false);
    }
  };

  const reassignTask = async () => {
    if (!token || !reassignAssigneeId) return;

    try {
      setIsReassigning(true);
      setError('');
      const response = await taskService.reassignTask(task.id, reassignAssigneeId, token);
      if (response.data) {
        updateLocal(response.data);
        setFields((current) => ({ ...current, assignee_id: response.data?.assignee_id || reassignAssigneeId }));
      }
      setReassignAssigneeId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reassign task');
    } finally {
      setIsReassigning(false);
    }
  };

  const addSubtask = async () => {
    if (!token || !subtaskTitle.trim()) return;

    try {
      setError('');
      const response = await taskService.addSubtask(task.id, subtaskTitle.trim(), token);
      if (response.data) updateLocal(response.data);
      setSubtaskTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add subtask');
    }
  };

  const toggleSubtask = async (subtask: Subtask, checked: boolean) => {
    if (!token) return;
    const subtaskId = subtask.id || subtask._id || '';
    if (!subtaskId) return;

    try {
      setError('');
      const response = await taskService.toggleSubtask(subtaskId, checked, token);
      if (response.data) updateLocal(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subtask');
    }
  };

  const toggleDependency = (dependencyId: string, checked: boolean) => {
    setSelectedDependencyIds((current) => (
      checked ? [...new Set([...current, dependencyId])] : current.filter((id) => id !== dependencyId)
    ));
  };

  const handleCommentFiles = async (files: FileList | File[]) => {
    if (!token) return;

    try {
      setIsCommentUploading(true);
      const uploaded = await Promise.all(Array.from(files).map((file) => taskService.uploadFile(file, token)));
      setCommentAttachments((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload comment attachment');
    } finally {
      setIsCommentUploading(false);
    }
  };

  const insertMention = (user: User) => {
    const mention = `@${user.full_name.replace(/\s+/g, '_')}`;
    setCommentText((current) => current.replace(/@[\p{L}\p{N}_.-]*$/u, `${mention} `));
  };

  const upsertComment = (comment: Comment) => {
    const commentId = comment.id || comment._id || '';
    setComments((current) => {
      if (commentId && current.some((item) => (item.id || item._id) === commentId)) {
        return current.map((item) => ((item.id || item._id) === commentId ? comment : item));
      }
      if (!commentId && current.some((item) => (
        item.text === comment.text
        && getEntityId(item.sender_id) === getEntityId(comment.sender_id)
        && item.client_request_id
        && item.client_request_id === comment.client_request_id
      ))) {
        return current;
      }
      return [...current, comment];
    });
  };

  const submitComment = async () => {
    if (!token || (!commentText.trim() && commentAttachments.length === 0)) return;
    if (isPostingCommentRef.current || isCommenting) return;

    try {
      isPostingCommentRef.current = true;
      setIsCommenting(true);
      setError('');
      // Stop typing indicator before submitting
      const taskId = task.id || task._id || '';
      emitTypingStatus(taskId, false);
      
      const response = await taskService.createComment(task.id, {
        text: commentText.trim(),
        attachments: commentAttachments,
        client_request_id: crypto.randomUUID(),
      }, token);
      if (response.data) upsertComment(response.data as Comment);
      setCommentText('');
      setCommentAttachments([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsCommenting(false);
      isPostingCommentRef.current = false;
    }
  };

  const getCommentSender = (comment: Comment) => (
    typeof comment.sender_id === 'object' ? comment.sender_id : userMap.get(comment.sender_id)
  );

  const getAttachmentUploaderName = (attachment: Attachment) => {
    if (typeof attachment.uploaded_by === 'object') return attachment.uploaded_by.full_name;
    return attachment.uploaded_by ? userMap.get(attachment.uploaded_by)?.full_name || 'Unknown' : 'Unknown';
  };

  const formatFileSize = (size?: number) => {
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (attachment: Attachment) => (
    attachment.file_name.split('.').pop()?.toLowerCase() || ''
  );

  const getPreviewKind = (attachment: Attachment) => {
    const type = attachment.file_type || '';
    const extension = getFileExtension(attachment);
    if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension)) return 'image';
    if (type === 'application/pdf' || extension === 'pdf') return 'pdf';
    if (type.startsWith('text/') || ['txt', 'csv'].includes(extension)) return 'text';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'office';
    return 'unsupported';
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl p-0 overflow-hidden flex flex-col">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-border flex-shrink-0">
            <SheetTitle className="text-xl font-semibold text-foreground leading-tight">
              {task.title}
            </SheetTitle>
            {error && <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            {isOrphanedTask && (
              <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3">
                <div className="flex items-start gap-2 text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Assignee inactive</p>
                    <p className="text-xs text-red-700">
                      {assignee?.full_name || assignee?.email || 'Current assignee'} is offboarded. Re-assign this task to continue work.
                    </p>
                  </div>
                </div>
                {canManageTaskFields && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Select value={reassignAssigneeId} onValueChange={setReassignAssigneeId}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select new assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeAssignableUsers.map((candidate) => (
                          <SelectItem key={getUserId(candidate)} value={getUserId(candidate)}>
                            {candidate.full_name || candidate.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={reassignTask} disabled={!reassignAssigneeId || isReassigning} className="bg-red-600 hover:bg-red-700">
                      {isReassigning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Re-assign'}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {canSubmitResult && (
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => setShowSubmitDialog(true)}>
                <Send className="mr-2 h-4 w-4" />
                Gui bao cao hoan thanh
              </Button>
            )}
            {canReviewResult && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="mb-3 text-sm font-medium text-amber-900">Task dang cho nghiem thu.</p>
                {task.execution_result?.note && (
                  <p className="mb-3 text-sm text-amber-800">{task.execution_result.note}</p>
                )}
                {(task.execution_result?.submitted_files || []).length > 0 && (
                  <div className="mb-3 space-y-1">
                    {(task.execution_result?.submitted_files || []).map((file) => (
                      <a key={file.file_url} href={file.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-700 hover:underline">
                        <Paperclip className="h-3 w-3" />
                        {file.file_name}
                      </a>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={isReviewing} onClick={() => reviewResult('approve')}>
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Nghiem thu
                  </Button>
                  <Button size="sm" variant="destructive" disabled={isReviewing} onClick={() => setShowRejectDialog(true)}>
                    <XCircle className="mr-1 h-4 w-4" />
                    Yeu cau lam lai
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden grid grid-cols-1 sm:grid-cols-5">
            <div className="sm:col-span-3 p-6 space-y-6 overflow-y-auto border-r border-border">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Mo ta va tai lieu</h3>
                  {canManageTaskFields && (
                    <Button size="sm" onClick={() => saveDetails()} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                      Luu
                    </Button>
                  )}
                </div>
                <RichTextEditor value={contentHtml} onChange={setContentHtml} disabled={isSaving || !canManageTaskFields} />
              </div>

              {canManageTaskFields && (
                <div
                  className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (event.dataTransfer.files.length) void handleFiles(event.dataTransfer.files);
                  }}
                >
                  <UploadCloud className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm font-medium text-slate-700">Keo tha file vao day</p>
                  <p className="text-xs text-slate-500">Toi da 10MB/file, chan .exe va .sh</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp"
                    onChange={(event) => event.target.files && handleFiles(event.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chon file'}
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.file_url} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{attachment.file_name}</p>
                        <p className="text-xs text-slate-500">
                          {attachment.file_type || 'file'} {formatFileSize(attachment.size)}
                          {' / '}
                          {getAttachmentUploaderName(attachment)}
                          {attachment.uploaded_at ? ` / ${new Date(attachment.uploaded_at).toLocaleString('vi-VN')}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setPreviewAttachment(attachment)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button asChild variant="ghost" size="icon">
                        <a href={attachment.file_url} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      {canManageTaskFields && (
                        <Button variant="ghost" size="icon" onClick={() => removeAttachment(attachment.file_url)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && <p className="text-sm text-slate-500">Chua co file dinh kem.</p>}
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <CheckSquare className="h-4 w-4" />
                    Subtasks
                  </h3>
                  <span className="text-xs text-slate-500">{completedSubtasks}/{subtasks.length} hoan thanh</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${subtaskProgress}%` }} />
                </div>
                <Input
                  value={subtaskTitle}
                  onChange={(event) => setSubtaskTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void addSubtask();
                    }
                  }}
                  placeholder="Nhap subtask va bam Enter..."
                />
                <div className="space-y-2">
                  {subtasks.map((subtask) => {
                    const checked = Boolean(subtask.done || subtask.isDone || subtask.is_completed);
                    return (
                      <label key={subtask.id || subtask._id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
                        <Checkbox checked={checked} onCheckedChange={(value) => toggleSubtask(subtask, value === true)} />
                        <span className={checked ? 'text-sm text-slate-400 line-through' : 'text-sm text-slate-800'}>
                          {subtask.text || subtask.title}
                        </span>
                      </label>
                    );
                  })}
                  {subtasks.length === 0 && <p className="text-sm text-slate-500">Chua co subtask.</p>}
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4" />
                  Binh luan
                </h3>
                <div className="space-y-4">
                  {comments.map((comment) => {
                    const sender = getCommentSender(comment);
                    return (
                      <div key={comment.id || comment._id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={sender?.avatar} />
                          <AvatarFallback className="text-[10px]">{sender?.full_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-sm font-medium">{sender?.full_name || 'Unknown'}</span>
                            <span className="text-[10px] text-slate-500">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleString('vi-VN') : ''}
                            </span>
                          </div>
                          {comment.text && <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.text}</p>}
                          {(comment.attachments || []).length > 0 && (
                            <div className="mt-2 space-y-1">
                              {(comment.attachments || []).map((attachment) => (
                                <a
                                  key={attachment.file_url}
                                  href={attachment.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 text-xs text-emerald-700 hover:underline"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  {attachment.file_name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {comments.length === 0 && <p className="text-sm text-slate-500">Chua co binh luan.</p>}
                </div>                {typingUsers.size > 0 && (
                  <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>
                        {Array.from(typingUsers.values()).join(', ')} dang gap...
                      </span>
                    </div>
                  </div>
                )}                <div className="relative">
                  <Textarea
                    value={commentText}
                    onChange={(event) => {
                      const newText = event.target.value;
                      setCommentText(newText);
                      // Emit typing indicator
                      const taskId = task.id || task._id || '';
                      emitTypingStatus(taskId, newText.trim().length > 0);
                    }}
                    onBlur={() => {
                      // Stop typing indicator when leaving textarea
                      const taskId = task.id || task._id || '';
                      emitTypingStatus(taskId, false);
                    }}
                    placeholder="Nhap binh luan, dung @ de tag thanh vien..."
                    rows={3}
                  />
                  {mentionUsers.length > 0 && (
                    <div className="absolute bottom-full left-0 z-20 mb-1 w-64 rounded-md border bg-white shadow-lg">
                      {mentionUsers.map((user) => (
                        <button
                          key={getUserId(user)}
                          type="button"
                          onClick={() => insertMention(user)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="text-[9px]">{user.full_name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{user.full_name}</span>
                            <span className="block truncate text-xs text-slate-500">{user.email}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {commentAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {commentAttachments.map((attachment) => (
                      <span key={attachment.file_url} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs">
                        <Paperclip className="h-3 w-3" />
                        {attachment.file_name}
                        <button
                          type="button"
                          onClick={() => setCommentAttachments((current) => current.filter((item) => item.file_url !== attachment.file_url))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div
                  className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (event.dataTransfer.files.length) void handleCommentFiles(event.dataTransfer.files);
                  }}
                >
                  Keo file vao day de dinh kem comment (toi da 10MB/file).
                </div>
                <input
                  ref={commentFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => event.target.files && handleCommentFiles(event.target.files)}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => commentFileInputRef.current?.click()} disabled={isCommentUploading}>
                    {isCommentUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <Button type="button" size="sm" onClick={submitComment} disabled={isCommenting || (!commentText.trim() && commentAttachments.length === 0)}>
                    {isCommenting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                    Gui
                  </Button>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 p-5 space-y-5 bg-accent/20 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Trang thai</label>
                <Select value={fields.status} onValueChange={(value) => setFields((current) => ({ ...current, status: value as TaskStatus }))} disabled={!canManageTaskFields}>
                  <SelectTrigger className="h-9 bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={(option.value === 'review' || option.value === 'done') && option.value !== fields.status}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Do uu tien</label>
                <Select value={fields.priority} onValueChange={(value) => setFields((current) => ({ ...current, priority: value as Priority }))} disabled={!canManageTaskFields}>
                  <SelectTrigger className="h-9 bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Nhom cong viec</label>
                <Input
                  value={fields.group_name}
                  disabled={!canManageTaskFields}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFields((current) => ({
                      ...current,
                      group_name: value,
                      group_key: value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general',
                    }));
                  }}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Diem KPI</label>
                <Input
                  type="number"
                  min="0"
                  value={fields.kpi_weight}
                  disabled={!canManageTaskFields}
                  onChange={(event) => setFields((current) => ({ ...current, kpi_weight: event.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Assignee</label>
                <Select value={fields.assignee_id} onValueChange={(value) => setFields((current) => ({ ...current, assignee_id: value }))} disabled={!canManageTaskFields}>
                  <SelectTrigger className="h-9 bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chua phan cong</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={getUserId(user)} value={getUserId(user)}>{user.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignee && (
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <Avatar className="h-5 w-5"><AvatarImage src={assignee.avatar} /><AvatarFallback className="text-[8px]">{assignee.full_name[0]}</AvatarFallback></Avatar>
                    <span className="text-xs text-muted-foreground">{assignee.full_name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Reviewer</label>
                <Select value={fields.reviewer_id} onValueChange={(value) => setFields((current) => ({ ...current, reviewer_id: value }))} disabled={!canManageTaskFields}>
                  <SelectTrigger className="h-9 bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chua co reviewer</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={getUserId(user)} value={getUserId(user)}>{user.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {reviewer && <p className="mt-2 text-xs text-muted-foreground">{reviewer.full_name}</p>}
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Thoi gian</label>
                <div className="space-y-3">
                  <Input type="date" value={fields.start_date} disabled={!canManageTaskFields} onChange={(event) => setFields((current) => ({ ...current, start_date: event.target.value }))} className="h-8 text-xs" />
                  <Input type="date" value={fields.due_date} disabled={!canManageTaskFields} onChange={(event) => setFields((current) => ({ ...current, due_date: event.target.value }))} className="h-8 text-xs" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Dependencies</label>
                <div className="space-y-2 rounded-md border border-slate-200 bg-card p-2">
                  {isLoadingDependencies && (
                    <div className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Dang tai dependencies
                    </div>
                  )}
                  {!isLoadingDependencies && visibleDependencyOptions.map((dependency) => {
                    const dependencyId = dependency.id || dependency._id || '';
                    const checked = selectedDependencyIds.includes(dependencyId);
                    return (
                      <label key={dependencyId} className="flex items-start gap-2 rounded px-1 py-1.5 hover:bg-slate-50">
                        <Checkbox
                          checked={checked}
                          disabled={!canManageTaskFields}
                          onCheckedChange={(value) => toggleDependency(dependencyId, value === true)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 truncate text-xs font-medium">
                            <Link2 className="h-3 w-3 flex-shrink-0 text-slate-400" />
                            {dependency.title}
                          </span>
                          <span className={dependency.status === 'done' ? 'text-[10px] text-emerald-600' : 'text-[10px] text-amber-600'}>
                            {dependency.status === 'done' ? 'Done' : `Blocking: ${dependency.status.replace('_', ' ')}`}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                  {!isLoadingDependencies && visibleDependencyOptions.length === 0 && (
                    <p className="px-1 py-2 text-xs text-muted-foreground">
                      {canManageTaskFields ? 'Khong co task khac de chon.' : 'Khong co dependency.'}
                    </p>
                  )}
                </div>
              </div>

              {canManageTaskFields && (
                <Button onClick={saveTaskFields} disabled={isSaving} className="w-full gap-2 mt-4 shadow-sm">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Luu thong tin
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>

      <Dialog open={Boolean(previewAttachment)} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.file_name || 'Preview'}</DialogTitle>
            <DialogDescription>
              {previewAttachment?.file_type || 'file'} {formatFileSize(previewAttachment?.size)}
            </DialogDescription>
          </DialogHeader>
          {previewAttachment && (
            <div className="min-h-[420px] overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {getPreviewKind(previewAttachment) === 'image' && (
                <div className="flex max-h-[70vh] items-center justify-center overflow-auto bg-slate-950/5 p-3">
                  <img src={previewAttachment.preview_url || previewAttachment.file_url} alt={previewAttachment.file_name} className="max-h-[68vh] max-w-full object-contain" />
                </div>
              )}
              {getPreviewKind(previewAttachment) === 'pdf' && (
                <iframe title={previewAttachment.file_name} src={previewAttachment.preview_url || previewAttachment.file_url} className="h-[70vh] w-full bg-white" />
              )}
              {getPreviewKind(previewAttachment) === 'text' && (
                <iframe title={previewAttachment.file_name} src={previewAttachment.preview_url || previewAttachment.file_url} className="h-[70vh] w-full bg-white" />
              )}
              {getPreviewKind(previewAttachment) === 'office' && (
                <div className="flex h-[420px] flex-col items-center justify-center gap-3 p-6 text-center">
                  <FileText className="h-10 w-10 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">Khong the xem truoc loai file nay tren trinh duyet hien tai.</p>
                  <p className="max-w-md text-xs text-slate-500">
                    Cau hinh ONLYOFFICE, Microsoft Office Online, Google Docs viewer hoac chuyen doi LibreOffice sang PDF tren server de preview Word/Excel/PowerPoint.
                  </p>
                  <Button asChild variant="outline">
                    <a href={previewAttachment.file_url} target="_blank" rel="noreferrer">Tai xuong</a>
                  </Button>
                </div>
              )}
              {getPreviewKind(previewAttachment) === 'unsupported' && (
                <div className="flex h-[420px] flex-col items-center justify-center gap-3 p-6 text-center">
                  <FileText className="h-10 w-10 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">Khong the xem truoc loai file nay, vui long tai xuong.</p>
                  <Button asChild variant="outline">
                    <a href={previewAttachment.file_url} target="_blank" rel="noreferrer">Tai xuong</a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gui bao cao hoan thanh</DialogTitle>
            <DialogDescription>Mo ta ket qua va dinh kem file ban giao neu co.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea value={submitNote} onChange={(event) => setSubmitNote(event.target.value)} rows={4} placeholder="Da xong phase 1..." />
            <div
              className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (event.dataTransfer.files.length) void handleSubmitFiles(event.dataTransfer.files);
              }}
            >
              Keo tha file ket qua vao day (toi da 10MB/file)
              <Input type="file" multiple className="mt-3" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp" onChange={(event) => event.target.files && handleSubmitFiles(event.target.files)} />
            </div>
            {submitFiles.length > 0 && (
              <div className="space-y-2">
                {submitFiles.map((file) => (
                  <div key={file.file_url} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span className="truncate">{file.file_name}</span>
                    <Button variant="ghost" size="icon" onClick={() => setSubmitFiles((current) => current.filter((item) => item.file_url !== file.file_url))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Huy</Button>
              <Button onClick={submitResult} disabled={isSubmittingResult || isUploading || !submitNote.trim()}>
                {isSubmittingResult ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gui bao cao'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeu cau lam lai</DialogTitle>
            <DialogDescription>Nhap ly do tu choi de assignee biet can sua gi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea value={rejectFeedback} onChange={(event) => setRejectFeedback(event.target.value)} rows={4} placeholder="Can bo sung..." />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Huy</Button>
              <Button variant="destructive" onClick={() => reviewResult('reject')} disabled={isReviewing || !rejectFeedback.trim()}>
                {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gui yeu cau lam lai'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
