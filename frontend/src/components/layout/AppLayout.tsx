import React, { useState } from 'react';
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
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopHeader onCreateNew={() => setShowCreate(true)} />
      <main className={cn(
        "pt-16 min-h-screen transition-all duration-300",
        sidebarCollapsed ? "pl-[68px]" : "pl-[240px]"
      )}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
      <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}