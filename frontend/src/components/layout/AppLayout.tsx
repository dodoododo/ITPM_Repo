import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppContext } from '@/lib/AppContext.tsx';
import Sidebar from './Sidebar.tsx';
import TopHeader from './TopHeader.tsx';
import CreateTaskModal from '@/components/tasks/CreateTaskModal.tsx';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const { sidebarCollapsed } = useAppContext();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <Sidebar />
      <TopHeader onCreateNew={() => setShowCreate(true)} />
      <main className={cn(
        "pt-[61px] min-h-screen transition-all duration-300",
        sidebarCollapsed ? "pl-[72px]" : "pl-[256px]"
      )}>
        <div className="p-5">
          <Outlet />
        </div>
      </main>
      <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
