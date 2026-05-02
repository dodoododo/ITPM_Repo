import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

// 1. Định nghĩa Interface cho Props
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon; // Kiểu dữ liệu chuẩn cho icon từ Lucide
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendUp, 
  className 
}: StatCardProps) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1.5 tracking-tight">{value}</p>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          {trend && (
            <p className={cn("text-xs font-medium mt-2", trendUp ? "text-emerald-600" : "text-destructive")}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}