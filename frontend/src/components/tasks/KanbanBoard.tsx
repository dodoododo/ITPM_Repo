import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// Import Type chuẩn từ file index.ts
import { type Task, type User, type TaskStatus } from '@/types';
import TaskCard from './TaskCard.tsx';
import TaskDetailPanel from './TaskDetailPanel.tsx';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  type DropResult 
} from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

// Cấu hình cột cục bộ (thay cho file .js bị lỗi)
const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string }> = {
  todo: { label: 'Cần làm', dot: 'bg-slate-400' },
  in_progress: { label: 'Đang làm', dot: 'bg-blue-500' },
  review: { label: 'Chờ duyệt', dot: 'bg-amber-500' },
  done: { label: 'Hoàn thành', dot: 'bg-emerald-500' },
};

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  users: User[];
}

export default function KanbanBoard({ projectId, tasks = [], users = [] }: KanbanBoardProps) {
  const qc = useQueryClient();
  
  // Fix lỗi "never": Khai báo kiểu cho State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Mock Mutation (Không dùng base44)
  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      console.log(`Mock Update Task ${id} to status: ${status}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id, status };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    const { draggableId, destination } = result;
    
    // Nếu kéo ra ngoài hoặc không thay đổi vị trí
    if (!destination) return;
    
    const task = tasks.find(t => t.id === draggableId);
    const newStatus = destination.droppableId as TaskStatus;

    if (task && task.status !== newStatus) {
      // Cập nhật trạng thái thông qua mutation
      mutation.mutate({ id: draggableId, status: newStatus });
    }
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-4">
          {COLUMNS.map(colId => {
            const config = STATUS_CONFIG[colId];
            const colTasks = tasks.filter(t => t.status === colId);

            return (
              <div key={colId} className="flex flex-col h-full min-h-[500px]">
                {/* Column Header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={cn("w-2.5 h-2.5 rounded-full", config.dot)} />
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">
                    {config.label}
                  </h3>
                  <span className="ml-auto text-[10px] text-muted-foreground bg-accent/50 rounded-full px-2 py-0.5 font-bold">
                    {colTasks.length}
                  </span>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={colId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex-1 space-y-3 p-2 rounded-xl transition-all duration-200 border-2 border-transparent",
                        snapshot.isDraggingOver 
                          ? "bg-primary/5 border-dashed border-primary/20" 
                          : "bg-accent/20"
                      )}
                    >
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "transition-transform",
                                snapshot.isDragging && "rotate-2 scale-105 z-50"
                              )}
                            >
                              <TaskCard 
                                task={task} 
                                users={users as any[]} 
                                onClick={setSelectedTask} 
                                isDragging={snapshot.isDragging} 
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="h-24 border-2 border-dashed border-muted/20 rounded-lg flex items-center justify-center">
                          <p className="text-[10px] text-muted-foreground italic text-center px-4">
                            Kéo task vào đây
                          </p>
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

      {/* Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          projectId={projectId}
          users={users as any[]}
          onUpdate={(updated) => setSelectedTask(updated)}
        />
      )}
    </>
  );
}