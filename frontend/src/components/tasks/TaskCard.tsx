import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CalendarClock,
  CheckSquare,
  Flag,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  Paperclip,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { type Priority, type Task, type TaskStatus, type User } from '@/types';

interface TaskCardProps {
  task: Task;
  users?: User[];
  onClick?: (task: Task) => void;
  isDragging?: boolean;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; classes: string }> = {
  low: { label: 'Low', classes: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', classes: 'bg-amber-50 text-amber-700' },
  high: { label: 'High', classes: 'bg-orange-50 text-orange-700' },
  urgent: { label: 'Urgent', classes: 'bg-red-50 text-red-700' },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; classes: string }> = {
  todo: { label: 'TODO', classes: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'DOING', classes: 'bg-blue-50 text-blue-700' },
  review: { label: 'REVIEW', classes: 'bg-amber-50 text-amber-700' },
  needs_revision: { label: 'REVISION', classes: 'bg-red-50 text-red-700' },
  done: { label: 'DONE', classes: 'bg-emerald-50 text-emerald-700' },
};

const getEntityId = (value?: string | { _id?: string; id?: string }) => (
  typeof value === 'string' ? value : value?._id || value?.id || ''
);

const formatShortDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'dd/MM');
};

const getImageAttachment = (task: Task) => (
  task.attachments?.find((attachment) => {
    const type = attachment.file_type || '';
    const url = attachment.file_url || '';
    return type.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(url);
  })
);

export default function TaskCard({ task, users = [], onClick, isDragging }: TaskCardProps) {
  const userMap = useMemo(
    () => Object.fromEntries(users.map((user) => [getEntityId(user), user])),
    [users]
  );

  const assignee = task.assignee || (task.assignee_id ? userMap[getEntityId(task.assignee_id)] : null);
  const isOrphaned = Boolean(
    task.assignee_id
    && assignee?.isActive === false
    && (task.status === 'todo' || task.status === 'in_progress' || task.status === 'needs_revision')
  );

  const priority = PRIORITY_CONFIG[task.priority as Priority] || PRIORITY_CONFIG.medium;
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((subtask) => subtask.done || subtask.isDone || subtask.is_completed).length;
  const attachmentCount = task.attachment_count || task.attachments?.length || 0;
  const dependencyCount = task.dependency_ids?.length || task.dependencies?.length || 0;
  const imageAttachment = getImageAttachment(task);
  const dueDate = formatShortDate(task.due_date);

  const isOverdue = useMemo(() => {
    if (!task.due_date || task.status === 'done') return false;
    return new Date(task.due_date) < new Date();
  }, [task.due_date, task.status]);

  return (
    <article
      onClick={() => onClick?.(task)}
      className={cn(
        'group cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_8px_22px_rgba(15,23,42,0.08)]',
        isDragging && 'rotate-1 border-emerald-300 shadow-xl',
        isOrphaned && 'border-red-300 bg-red-50/70'
      )}
    >
      {imageAttachment && (
        <div className="mb-3 overflow-hidden rounded-md border border-slate-100 bg-slate-100">
          <img src={imageAttachment.file_url} alt="" className="h-24 w-full object-cover" />
        </div>
      )}

      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase', priority.classes)}>
          <Flag className="h-3 w-3" />
          {priority.label}
        </span>
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase', status.classes)}>
          {status.label}
        </span>
      </div>

      <h4 className="line-clamp-2 min-h-[36px] text-[13px] font-bold leading-[18px] text-slate-900 transition-colors group-hover:text-emerald-700">
        {task.title}
      </h4>

      {(task.description || task.content_html) && (
        <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500">
          {(task.description || task.content_html || '').replace(/<[^>]*>/g, '')}
        </p>
      )}

      {isOrphaned && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md border border-red-200 bg-red-100 px-2 py-1 text-[11px] font-bold text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          Assignee inactive
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-[11px] font-semibold text-slate-400">
        {subtasks.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5" />
            {completedSubtasks}/{subtasks.length}
          </span>
        )}
        {attachmentCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" />
            {attachmentCount}
          </span>
        )}
        {dependencyCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Link2 className="h-3.5 w-3.5" />
            {dependencyCount}
          </span>
        )}
        {imageAttachment && (
          <span className="inline-flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            1
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          0
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          {assignee ? (
            <>
              <Avatar className="h-6 w-6 border border-white shadow-sm">
                <AvatarImage src={assignee.avatar} />
                <AvatarFallback className="bg-slate-100 text-[9px] font-bold text-slate-600">
                  {assignee.full_name?.[0] || assignee.email?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[120px] truncate text-[11px] font-semibold text-slate-600">
                {assignee.full_name || assignee.email}
              </span>
            </>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400">Unassigned</span>
          )}
        </div>

        {dueDate && (
          <span className={cn(
            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-extrabold',
            isOverdue ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
          )}>
            <CalendarClock className="h-3.5 w-3.5" />
            {dueDate}
          </span>
        )}
      </div>
    </article>
  );
}
