import { useState } from 'react';
import { LogOut, Plus, Search } from 'lucide-react';
import { useAppContext } from '@/lib/AppContext.tsx';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/notifications/NotificationBell';
import { cn } from '@/lib/utils';

interface TopHeaderProps {
  onCreateNew: () => void;
}

export default function TopHeader({ onCreateNew }: TopHeaderProps) {
  const { sidebarCollapsed } = useAppContext();
  const { logout } = useAuth();
  const [search, setSearch] = useState('');

  return (
    <header className={cn(
      'fixed top-0 right-0 h-16 bg-card/90 backdrop-blur-md border-b border-border flex items-center px-6 gap-4 z-20 transition-all duration-300',
      sidebarCollapsed ? 'left-[68px]' : 'left-[240px]'
    )}>
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tim kiem cong viec, du an..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9 bg-accent/50 border-transparent focus:border-primary/30 focus:bg-card h-10"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onCreateNew} size="sm" className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tao moi</span>
        </Button>

        <NotificationBell />

        <Button variant="ghost" size="icon" onClick={() => logout()}>
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
