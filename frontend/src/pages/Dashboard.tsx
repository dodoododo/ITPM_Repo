import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Clock3, Filter, ListChecks, Loader2, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  analyticsService,
  type AnalyticsRange,
  type AnalyticsSummary,
  type PerformanceRow,
} from '@/services/analyticsService';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

type StatusKey = 'todo' | 'in_progress' | 'review' | 'done';

const EMPTY_SUMMARY: AnalyticsSummary = {
  total: 0,
  done: 0,
  in_progress: 0,
  review: 0,
  todo: 0,
  overdue: 0,
  kpi: 0,
};

const STATUS_CONFIG: Array<{ key: StatusKey; label: string; fill: string }> = [
  { key: 'todo', label: 'Cần làm', fill: '#64748b' },
  { key: 'in_progress', label: 'Đang làm', fill: '#2563eb' },
  { key: 'review', label: 'Chờ duyệt', fill: '#d97706' },
  { key: 'done', label: 'Hoàn thành', fill: '#059669' },
];

const getProjectId = (project: Project) => project._id || project.id;

const getShortName = (name: string, email: string) => {
  const trimmed = name?.trim();
  if (!trimmed) return email;
  const parts = trimmed.split(/\s+/);
  return parts.length > 2 ? parts.slice(-2).join(' ') : trimmed;
};

export default function Dashboard() {
  const { token } = useAuth();
  const [range, setRange] = useState<AnalyticsRange>('month');
  const [projectId, setProjectId] = useState('all');
  const [summary, setSummary] = useState<AnalyticsSummary>(EMPTY_SUMMARY);
  const [performance, setPerformance] = useState<PerformanceRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let active = true;
    const params = { range, projectId };

    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const [summaryData, performanceData, projectData] = await Promise.all([
          analyticsService.getSummary(token, params),
          analyticsService.getPerformance(token, params),
          analyticsService.getProjects(token),
        ]);

        if (!active) return;
        setSummary(summaryData);
        setPerformance(performanceData);
        setProjects(projectData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Không tải được dữ liệu dashboard');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadAnalytics();

    return () => {
      active = false;
    };
  }, [token, range, projectId]);

  const statusData = useMemo(
    () =>
      STATUS_CONFIG.map((status) => ({
        ...status,
        value: summary[status.key],
      })).filter((status) => status.value > 0),
    [summary]
  );

  const performanceChart = useMemo(
    () =>
      performance.slice(0, 8).map((row) => ({
        ...row,
        name: getShortName(row.full_name, row.email),
      })),
    [performance]
  );

  const selectedProject = projects.find((project) => getProjectId(project) === projectId);
  const periodLabel = range === 'week' ? 'Tuần này' : 'Tháng này';

  return (
    <div className="flex h-full flex-col bg-slate-50 -mx-6 -mt-6">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-slate-950">Dashboard thống kê</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Theo dõi tổng việc, KPI, trạng thái xử lý và hiệu suất nhân sự.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex h-9 rounded-md border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setRange('week')}
                className={cn(
                  'rounded px-3 text-[12px] font-semibold transition-colors',
                  range === 'week' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Tuần này
              </button>
              <button
                type="button"
                onClick={() => setRange('month')}
                className={cn(
                  'rounded px-3 text-[12px] font-semibold transition-colors',
                  range === 'month' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Tháng này
              </button>
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="h-9 min-w-[210px] rounded-md border border-slate-200 bg-white pl-8 pr-3 text-[12px] font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="all">Tất cả dự án</option>
                {projects.map((project) => (
                  <option key={getProjectId(project)} value={getProjectId(project)}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-slate-500">
              Bộ lọc: <span className="text-slate-900">{periodLabel}</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-900">{selectedProject?.name || 'Tất cả dự án'}</span>
            </p>
            {loading && (
              <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang cập nhật
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Tổng việc" value={summary.total} icon={ListChecks} tone="blue" />
            <StatCard title="Đang làm" value={summary.in_progress} icon={Clock3} tone="amber" />
            <StatCard title="Trễ hạn" value={summary.overdue} icon={AlertTriangle} tone="red" />
            <StatCard title="% KPI" value={`${summary.kpi}%`} icon={TrendingUp} tone="emerald" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[13px] font-bold uppercase text-slate-800">Phân bổ trạng thái</h2>
                  <p className="mt-1 text-[12px] text-slate-500">Tính theo ngày tạo task trong bộ lọc hiện tại.</p>
                </div>
              </div>

              <div className="h-[260px]">
                {statusData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={92}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {statusData.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 10px 25px rgb(15 23 42 / 0.08)',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {STATUS_CONFIG.map((status) => (
                  <div key={status.key} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.fill }} />
                      <span className="text-[12px] font-medium text-slate-600">{status.label}</span>
                    </div>
                    <span className="text-[12px] font-bold text-slate-900">{summary[status.key]}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 xl:col-span-3">
              <div className="mb-4">
                <h2 className="text-[13px] font-bold uppercase text-slate-800">Xếp hạng hiệu suất</h2>
                <p className="mt-1 text-[12px] text-slate-500">So sánh số task hoàn thành và tổng task được giao.</p>
              </div>

              <div className="h-[260px]">
                {performanceChart.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={performanceChart}
                      layout="vertical"
                      margin={{ top: 6, right: 24, bottom: 6, left: 10 }}
                    >
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={104}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#475569' }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 10px 25px rgb(15 23 42 / 0.08)',
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="total" name="Được giao" fill="#cbd5e1" radius={[0, 5, 5, 0]} barSize={12} />
                      <Bar dataKey="done" name="Hoàn thành" fill="#059669" radius={[0, 5, 5, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-[13px] font-bold uppercase text-slate-800">Chi tiết nhân sự</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {performance.length === 0 ? (
                <div className="px-5 py-10 text-center text-[13px] text-slate-500">Chưa có dữ liệu hiệu suất.</div>
              ) : (
                performance.map((row) => (
                  <div key={row.user_id} className="grid gap-3 px-5 py-3 md:grid-cols-[minmax(0,1fr)_110px_160px] md:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-900">{row.full_name || row.email}</p>
                      <p className="truncate text-[12px] text-slate-500">{row.email}</p>
                    </div>
                    <p className="text-[12px] font-medium text-slate-600">
                      {row.done}/{row.total} hoàn thành
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${row.completion_rate}%` }} />
                      </div>
                      <span className="w-10 text-right text-[12px] font-bold text-slate-900">{row.completion_rate}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return <div className="flex h-full items-center justify-center text-[13px] text-slate-400">Không có dữ liệu</div>;
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number | string;
  icon: typeof ListChecks;
  tone: 'blue' | 'amber' | 'red' | 'emerald';
}) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md border', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-black leading-none tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
