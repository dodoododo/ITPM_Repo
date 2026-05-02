import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// 1. Định nghĩa kiểu dữ liệu cho các thực thể (Dựa trên Database mày gửi)
export interface Department {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface Project {
  id?: string;
  name: string;
  description?: string;
  department?: string;
  color?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  progress?: number;
}

// 2. Định nghĩa Interface cho Context để TS không báo lỗi 'never'
interface AppContextType {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  departments: Department[];
  projects: Project[];
  addProject: (project: Project) => void;
}

// 3. Khởi tạo Context với kiểu dữ liệu rõ ràng
const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Thêm State để lưu trữ Projects và Departments
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Mock dữ liệu phòng ban để các trang list/modal có dữ liệu hiển thị ngay
  const [departments] = useState<Department[]>([
    { id: 'dept-1', name: 'Ban Giám đốc', color: '#2563EB' },
    { id: 'dept-2', name: 'Phòng Kỹ thuật', color: '#7C3AED' },
    { id: 'dept-3', name: 'Phòng Marketing', color: '#059669' },
  ]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const addProject = useCallback((project: Project) => {
    const newProject = {
      ...project,
      id: Math.random().toString(36).substr(2, 9), // Tạo ID tạm thời
    };
    setProjects(prev => [...prev, newProject]);
  }, []);

  return (
    <AppContext.Provider value={{ 
      sidebarCollapsed, 
      toggleSidebar, 
      departments, 
      projects, 
      addProject 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};