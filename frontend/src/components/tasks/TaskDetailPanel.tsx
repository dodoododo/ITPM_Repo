import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CheckSquare, Download, FileText, Loader2, MessageSquare, Paperclip, Save, Send, UploadCloud, X, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { taskService } from '@/services/taskService';
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
  start_date: string;
  due_date: string;
  status: TaskStatus;
}

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: 'low', label: 'Thap' },
  { value: 'medium', label: 'Trung binh' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khan cap' },
];

const getUserId = (user: User) => user._id || user.id || '';

const toDateInput = (value?: string) => {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
};

export default function TaskDetailPanel({ task, open, onClose, projectId, users = [], onUpdate }: TaskDetailPanelProps) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<TaskFields>({
    assignee_id: 'none',
    reviewer_id: 'none',
    priority: 'medium',
    start_date: '',
    due_date: '',
    status: 'todo',
  });
  const [contentHtml, setContentHtml] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!task) return;
    setFields({
      assignee_id: task.assignee_id || 'none',
      reviewer_id: task.reviewer_id || 'none',
      priority: task.priority || 'medium',
      start_date: toDateInput(task.start_date),
      due_date: toDateInput(task.due_date),
      status: task.status || 'todo',
    });
    setContentHtml(task.content_html || task.description || '');
    setAttachments(task.attachments || []);
    setSubtaskTitle('');
    setCommentText('');
    setCommentAttachments([]);
    setSubmitNote('');
    setSubmitFiles([]);
    setRejectFeedback('');
    setShowSubmitDialog(false);
    setShowRejectDialog(false);
    setError('');
  }, [task?.id]);

  useEffect(() => {
    if (!token || !open || !task?.id) return;
    void loadComments(task.id);
  }, [token, open, task?.id]);

  const userMap = useMemo(() => (
    new Map(users.map((user) => [getUserId(user), user]))
  ), [users]);

  if (!task) return null;

  const assignee = fields.assignee_id !== 'none' ? userMap.get(fields.assignee_id) : null;
  const reviewer = fields.reviewer_id !== 'none' ? userMap.get(fields.reviewer_id) : null;
  const currentUserId = token ? (() => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      return payload.userId as string;
    } catch {
      return '';
    }
  })() : '';
  const canSubmitResult = Boolean(task.assignee_id && task.assignee_id === currentUserId && task.status !== 'done' && task.status !== 'review');
  const canReviewResult = Boolean(
    task.status === 'review'
    && (task.reviewer_id === currentUserId || task.created_by === currentUserId)
  );
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((subtask) => subtask.done || subtask.is_completed).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;
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
        start_date: fields.start_date,
        due_date: fields.due_date,
        status: fields.status,
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
    try {
      setIsSubmittingResult(true);
      setError('');
      const response = await taskService.submitResult(task.id, {
        note: submitNote,
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

  const submitComment = async () => {
    if (!token || (!commentText.trim() && commentAttachments.length === 0)) return;

    try {
      setIsCommenting(true);
      setError('');
      const response = await taskService.createComment(task.id, {
        text: commentText.trim(),
        attachments: commentAttachments,
      }, token);
      if (response.data) setComments((current) => [...current, response.data as Comment]);
      setCommentText('');
      setCommentAttachments([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const getCommentSender = (comment: Comment) => (
    typeof comment.sender_id === 'object' ? comment.sender_id : userMap.get(comment.sender_id)
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl p-0 overflow-hidden flex flex-col">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-border flex-shrink-0">
            <SheetTitle className="text-xl font-semibold text-foreground leading-tight">
              {task.title}
            </SheetTitle>
            {error && <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
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
                  <Button size="sm" onClick={() => saveDetails()} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    Luu
                  </Button>
                </div>
                <RichTextEditor value={contentHtml} onChange={setContentHtml} disabled={isSaving} />
              </div>

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
                <p className="text-xs text-slate-500">Ho tro Word, PDF, Excel, JPG, PNG</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
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

              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.file_url} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{attachment.file_name}</p>
                        <p className="text-xs text-slate-500">{attachment.file_type || 'file'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button asChild variant="ghost" size="icon">
                        <a href={attachment.file_url} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeAttachment(attachment.file_url)}>
                        <X className="h-4 w-4" />
                      </Button>
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
                    const checked = Boolean(subtask.done || subtask.is_completed);
                    return (
                      <label key={subtask.id || subtask._id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
                        <Checkbox checked={checked} onCheckedChange={(value) => toggleSubtask(subtask, value === true)} />
                        <span className={checked ? 'text-sm text-slate-400 line-through' : 'text-sm text-slate-800'}>
                          {subtask.title}
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
                </div>
                <div className="relative">
                  <Textarea
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
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
                  Keo anh/file vao day de dinh kem comment.
                </div>
                <input
                  ref={commentFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
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
                <Select value={fields.status} onValueChange={(value) => setFields((current) => ({ ...current, status: value as TaskStatus }))}>
                  <SelectTrigger className="h-9 bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Do uu tien</label>
                <Select value={fields.priority} onValueChange={(value) => setFields((current) => ({ ...current, priority: value as Priority }))}>
                  <SelectTrigger className="h-9 bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Assignee</label>
                <Select value={fields.assignee_id} onValueChange={(value) => setFields((current) => ({ ...current, assignee_id: value }))}>
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
                <Select value={fields.reviewer_id} onValueChange={(value) => setFields((current) => ({ ...current, reviewer_id: value }))}>
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
                  <Input type="date" value={fields.start_date} onChange={(event) => setFields((current) => ({ ...current, start_date: event.target.value }))} className="h-8 text-xs" />
                  <Input type="date" value={fields.due_date} onChange={(event) => setFields((current) => ({ ...current, due_date: event.target.value }))} className="h-8 text-xs" />
                </div>
              </div>

              <Button onClick={saveTaskFields} disabled={isSaving} className="w-full gap-2 mt-4 shadow-sm">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Luu thong tin
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>

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
              Keo tha file ket qua vao day
              <Input type="file" multiple className="mt-3" onChange={(event) => event.target.files && handleSubmitFiles(event.target.files)} />
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
              <Button onClick={submitResult} disabled={isSubmittingResult || isUploading}>
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
