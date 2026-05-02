import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// Đã xóa import base44 bị lỗi
import { useAppContext } from '@/lib/AppContext.tsx';
import { Search, Plus, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// 1. Định nghĩa Interface để fix lỗi "implicitly has an any type"
interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  due_date?: string;
}

interface TopHeaderProps {
  onCreateNew: () => void;
}

// 2. Mock Data thay thế cho API thật
const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Thiết kế UI Dashboard', status: 'review', due_date: '2026-05-01' },
  { id: '2', title: 'Fix bug login Google', status: 'review', due_date: '2026-04-30' },
  { id: '3', title: 'Viết tài liệu API', status: 'todo' },
];

export default function TopHeader({ onCreateNew }: TopHeaderProps) {
  const { sidebarCollapsed } = useAppContext();
  const [search, setSearch] = useState('');

  // 3. Sử dụng Mock Data trong useQuery
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      // Giả lập delay mạng 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
      return MOCK_TASKS;
    },
    staleTime: 60 * 1000,
  });

  const reviewCount = tasks.filter((t: Task) => t.status === 'review').length;

  return (
    <header className={cn(
      "fixed top-0 right-0 h-16 bg-card/90 backdrop-blur-md border-b border-border flex items-center px-6 gap-4 z-20 transition-all duration-300",
      sidebarCollapsed ? "left-[68px]" : "left-[240px]"
    )}>
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm công việc, dự án..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-accent/50 border-transparent focus:border-primary/30 focus:bg-card h-10"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onCreateNew} size="sm" className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tạo mới</span>
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {reviewCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {reviewCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b border-border">
              <h3 className="font-semibold text-sm">Chờ duyệt ({reviewCount})</h3>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {tasks.filter((t: Task) => t.status === 'review').map((t: Task) => (
                <div key={t.id} className="px-3 py-3 border-b border-border last:border-0 bg-amber-50/50">
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Đang chờ phê duyệt</p>
                  {t.due_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">Hạn: {format(new Date(t.due_date), 'dd/MM/yyyy')}</p>
                  )}
                </div>
              ))}
              {reviewCount === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">Không có task nào chờ duyệt</div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}