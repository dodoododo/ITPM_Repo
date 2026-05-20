import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { useAuth } from '@/hooks/useAuth';
import { taskService } from '@/services/taskService';
import { type Task, type TaskStatus, type User } from '@/types';
import TaskCard from './TaskCard.tsx';
import TaskDetailPanel from './TaskDetailPanel.tsx';
import { cn } from '@/lib/utils';

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string }> = {
  todo: { label: 'Todo', dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', dot: 'bg-blue-500' },
  review: { label: 'Review', dot: 'bg-amber-500' },
  done: { label: 'Done', dot: 'bg-emerald-500' },
};

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  users: User[];
  onTaskUpdated?: (task: Task) => void;
  initialTaskId?: string;
  onTaskDetailClose?: () => void;
}

export default function KanbanBoard({
  projectId,
  tasks = [],
  users = [],
  onTaskUpdated,
  initialTaskId = '',
  onTaskDetailClose,
}: KanbanBoardProps) {
  const qc = useQueryClient();
  const { token } = useAuth();
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [autoOpenedTaskId, setAutoOpenedTaskId] = useState('');

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (!initialTaskId) {
      setAutoOpenedTaskId('');
      return;
    }

    if (autoOpenedTaskId === initialTaskId) return;

    const task = localTasks.find((item) => item.id === initialTaskId || item._id === initialTaskId);
    if (task) {
      setSelectedTask(task);
      setAutoOpenedTaskId(initialTaskId);
    }
  }, [initialTaskId, localTasks, autoOpenedTaskId]);

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      if (!token) throw new Error('Missing auth token');
      return taskService.updateTaskStatus(id, status, token);
    },
    onSuccess: (response) => {
      if (response.data) {
        setLocalTasks((current) => current.map((task) => task.id === response.data?.id ? response.data : task));
        onTaskUpdated?.(response.data);
      }
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      setLocalTasks(tasks);
    },
  });

  const handleDragEnd = (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;

    const task = localTasks.find((item) => item.id === draggableId);
    const nextStatus = destination.droppableId as TaskStatus;

    if (task && nextStatus === 'done' && task.status !== 'done') {
      setSelectedTask(task);
      return;
    }

    if (task && task.status !== nextStatus) {
      setLocalTasks((current) => current.map((item) => (
        item.id === draggableId ? { ...item, status: nextStatus } : item
      )));
      mutation.mutate({ id: draggableId, status: nextStatus });
    }
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-4">
          {COLUMNS.map((columnId) => {
            const config = STATUS_CONFIG[columnId];
            const columnTasks = localTasks.filter((task) => task.status === columnId);

            return (
              <div key={columnId} className="flex flex-col h-full min-h-[500px]">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={cn('w-2.5 h-2.5 rounded-full', config.dot)} />
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">{config.label}</h3>
                  <span className="ml-auto text-[10px] text-muted-foreground bg-accent/50 rounded-full px-2 py-0.5 font-bold">
                    {columnTasks.length}
                  </span>
                </div>

                <Droppable droppableId={columnId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex-1 space-y-3 p-2 rounded-xl transition-all duration-200 border-2 border-transparent',
                        snapshot.isDraggingOver ? 'bg-primary/5 border-dashed border-primary/20' : 'bg-accent/20'
                      )}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={cn('transition-transform', dragSnapshot.isDragging && 'rotate-2 scale-105 z-50')}
                            >
                              <TaskCard
                                task={task}
                                users={users}
                                onClick={setSelectedTask}
                                isDragging={dragSnapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="h-24 border-2 border-dashed border-muted/20 rounded-lg flex items-center justify-center">
                          <p className="text-[10px] text-muted-foreground italic text-center px-4">Keo task vao day</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => {
            setSelectedTask(null);
            onTaskDetailClose?.();
          }}
          projectId={projectId}
          users={users}
          onUpdate={(updated) => {
            setSelectedTask(updated);
            setLocalTasks((current) => current.map((task) => task.id === updated.id ? updated : task));
            onTaskUpdated?.(updated);
          }}
        />
      )}
    </>
  );
}
