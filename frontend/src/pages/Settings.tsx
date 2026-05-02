import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// Import Type chuẩn từ file index.ts của mày
import { type User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, User as UserIcon, Bell, ShieldCheck, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- 1. Mock Data (Thay thế API thật) ---
const MOCK_USER: User = {
  id: 'u1',
  full_name: 'Tăng Ngọc Hậu',
  email: 'hau@itpm.pro',
  avatar: '',
  role: 'Administrator'
};

export default function Settings() {
  // Query sử dụng Mock Data
  const { data: currentUser, isLoading } = useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 500)); // Giả lập delay
      return MOCK_USER;
    },
    staleTime: 10 * 60 * 1000,
  });

  const [saved, setSaved] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSave = async () => {
    setSaved(true);
    // Giả lập lưu thành công
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Cài đặt hệ thống</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">Quản lý thông tin tài khoản và cấu hình thông báo cá nhân.</p>
      </div>

      {/* Profile Section */}
      <div className="bg-card rounded-2xl border border-border p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserIcon className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Hồ sơ cá nhân</h2>
        </div>

        <div className="flex items-center gap-6 mb-8 p-4 bg-accent/5 rounded-xl border border-border/50">
          <Avatar className="h-20 w-20 border-2 border-background shadow-md">
            <AvatarImage src={currentUser?.avatar} />
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {currentUser?.full_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-xl font-bold text-foreground">{currentUser?.full_name}</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <Mail className="w-3.5 h-3.5" /> {currentUser?.email}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> {currentUser?.role}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Họ và tên</Label>
            <Input 
              defaultValue={currentUser?.full_name} 
              className="mt-1 font-medium focus-visible:ring-primary" 
              placeholder="Nhập tên của bạn"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Địa chỉ Email</Label>
            <Input 
              defaultValue={currentUser?.email} 
              className="mt-1 font-medium bg-muted/50" 
              disabled 
            />
            <p className="text-[10px] text-muted-foreground">Liên hệ quản trị viên để thay đổi Email.</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 flex justify-end">
          <Button 
            className={cn("min-w-[140px] font-bold transition-all", saved && "bg-emerald-600 hover:bg-emerald-600")} 
            onClick={handleSave}
          >
            {saved ? '✓ Đã lưu thay đổi' : 'Lưu thông tin'}
          </Button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Cấu hình thông báo</h2>
        </div>

        <div className="space-y-1 divide-y divide-border/50">
          {[
            { label: 'Thông báo khi được giao task mới', desc: 'Nhận thông báo ngay khi có người chỉ định bạn vào một công việc.' },
            { label: 'Thông báo khi có bình luận', desc: 'Cập nhật các thảo luận trong các task bạn đang tham gia.' },
            { label: 'Nhắc nhở task sắp đến hạn', desc: 'Gửi lời nhắc trước 24h khi task của bạn đến hạn chót.' },
            { label: 'Thông báo khi task cần duyệt', desc: 'Chỉ dành cho Reviewer khi có task chuyển sang trạng thái chờ duyệt.' }
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-4 group">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch defaultChecked className="data-[state=checked]:bg-primary" />
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone (Optional but makes it feel real) */}
      <div className="p-6 border border-destructive/20 rounded-2xl bg-destructive/5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-destructive">Vùng nguy hiểm</p>
          <p className="text-xs text-muted-foreground">Đăng xuất khỏi thiết bị hoặc xóa tài khoản vĩnh viễn.</p>
        </div>
        <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all font-bold">
          Đăng xuất
        </Button>
      </div>
    </div>
  );
}