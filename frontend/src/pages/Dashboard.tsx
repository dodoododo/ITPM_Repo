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
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Filter,
  ListChecks,
  Loader2,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import {
  analyticsService,
  type AnalyticsRange,
  type AnalyticsSummary,
  type PerformanceRow,
} from '@/services/analyticsService';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

type StatusKey = 'todo' | 'in_progress' | 'review' | 'needs_revision' | 'done';

const EMPTY_SUMMARY: AnalyticsSummary = {
  total: 0,
  done: 0,
  in_progress: 0,
  review: 0,
  needs_revision: 0,
  todo: 0,
  overdue: 0,
  kpi: 0,
};

const STATUS_CONFIG: Array<{ key: StatusKey; label: string; fill: string }> = [
  { key: 'todo', label: 'Todo', fill: '#64748b' },
  { key: 'in_progress', label: 'Doing', fill: '#2563eb' },
  { key: 'review', label: 'Review', fill: '#d97706' },
  { key: 'needs_revision', label: 'Needs Revision', fill: '#ef4444' },
  { key: 'done', label: 'Done', fill: '#059669' },
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
        setError(err instanceof Error ? err.message : 'Khong tai duoc du lieu dashboard');
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
  const periodLabel = range === 'week' ? 'Tuan nay' : 'Thang nay';
  const completionRate = summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;

  return (
    <div className="flex h-[calc(100vh-101px)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-slate-950">Dashboard KPI noi bo</h1>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              Tong quan cong viec, tien do, qua han va hieu suat nhan su theo bo loc hien tai.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex h-8 rounded-md border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setRange('week')}
                className={cn(
                  'rounded px-3 text-[12px] font-bold transition-colors',
                  range === 'week' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Tuan
              </button>
              <button
                type="button"
                onClick={() => setRange('month')}
                className={cn(
                  'rounded px-3 text-[12px] font-bold transition-colors',
                  range === 'month' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Thang
              </button>
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="h-8 min-w-[220px] rounded-md border border-slate-200 bg-white pl-8 pr-3 text-[12px] font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="all">Tat ca du an</option>
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

      <div className="flex-1 overflow-auto bg-[#f3f4f6] p-4">
        <div className="mx-auto max-w-[1480px] space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-slate-500">
              Bo loc: <span className="text-slate-900">{periodLabel}</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-900">{selectedProject?.name || 'Tat ca du an'}</span>
            </p>
            {loading && (
              <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Dang cap nhat
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <StatCard title="Tong cong viec" value={summary.total} icon={ListChecks} tone="blue" />
            <StatCard title="Hoan thanh" value={summary.done} icon={CheckCircle2} tone="emerald" />
            <StatCard title="Dang lam" value={summary.in_progress} icon={Clock3} tone="blue" />
            <StatCard title="Qua han" value={summary.overdue} icon={AlertTriangle} tone="red" />
            <StatCard title="KPI trung binh" value={`${summary.kpi}%`} icon={TrendingUp} tone="emerald" />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <section className="enterprise-panel p-4 xl:col-span-4">
              <SectionHeader title="Trang thai cong viec" description="Phan bo task theo trang thai xu ly." />
              <div className="h-[250px]">
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
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {statusData.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_CONFIG.map((status) => (
                  <div key={status.key} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                    <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.fill }} />
                      {status.label}
                    </span>
                    <span className="text-[12px] font-extrabold text-slate-900">{summary[status.key]}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="enterprise-panel p-4 xl:col-span-5">
              <SectionHeader title="Hieu suat ca nhan" description="So sanh tong task duoc giao va task da hoan thanh." />
              <div className="h-[328px]">
                {performanceChart.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceChart} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
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
                      <RechartsTooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="total" name="Duoc giao" fill="#cbd5e1" radius={[0, 5, 5, 0]} barSize={12} />
                      <Bar dataKey="done" name="Hoan thanh" fill="#059669" radius={[0, 5, 5, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="enterprise-panel p-4 xl:col-span-3">
              <SectionHeader title="KPI theo thang" description="Chi so nhanh tu bo loc hien tai." />
              <div className="mt-4 space-y-4">
                <KpiMeter label="Hoan thanh" value={completionRate} color="bg-emerald-500" />
                <KpiMeter label="KPI trung binh" value={summary.kpi} color="bg-blue-500" />
                <KpiMeter label="Task dung tien do" value={Math.max(0, 100 - Math.min(summary.overdue * 10, 100))} color="bg-amber-500" />
              </div>
              <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Tin hieu can chu y</p>
                <p className="mt-2 text-[13px] font-semibold text-slate-800">
                  {summary.overdue > 0 ? `${summary.overdue} cong viec dang qua han` : 'Khong co cong viec qua han'}
                </p>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <section className="enterprise-panel xl:col-span-5">
              <div className="border-b border-slate-100 px-4 py-3">
                <SectionHeader title="Tien do du an" description="Theo doi nhanh cac workspace dang chay." />
              </div>
              <div className="divide-y divide-slate-100">
                {projects.length === 0 ? (
                  <div className="px-4 py-10 text-center text-[13px] text-slate-500">Chua co du lieu du an.</div>
                ) : (
                  projects.slice(0, 8).map((project) => (
                    <div key={getProjectId(project)} className="px-4 py-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-slate-900">{project.name}</p>
                          <p className="text-[11px] font-semibold uppercase text-slate-400">{project.status}</p>
                        </div>
                        <span className="text-[12px] font-extrabold text-slate-800">{project.progress || 0}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${project.progress || 0}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="enterprise-panel xl:col-span-7">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <SectionHeader title="Bang xep hang nhan su" description="Sap xep theo ty le hoan thanh trong bo loc." />
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>
              <div className="divide-y divide-slate-100">
                {performance.length === 0 ? (
                  <div className="px-4 py-10 text-center text-[13px] text-slate-500">Chua co du lieu hieu suat.</div>
                ) : (
                  performance.map((row, index) => (
                    <div key={row.user_id} className="grid gap-3 px-4 py-3 md:grid-cols-[40px_minmax(0,1fr)_110px_180px] md:items-center">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-[12px] font-extrabold text-slate-600">
                        {index + 1}
                      </div>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={row.avatar} />
                          <AvatarFallback className="bg-slate-100 text-[11px] font-bold text-slate-600">
                            {row.full_name?.[0] || row.email?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-slate-900">{row.full_name || row.email}</p>
                          <p className="truncate text-[12px] text-slate-500">{row.email}</p>
                        </div>
                      </div>
                      <p className="text-[12px] font-semibold text-slate-600">
                        {row.done}/{row.total} done
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${row.completion_rate}%` }} />
                        </div>
                        <span className="w-10 text-right text-[12px] font-extrabold text-slate-900">{row.completion_rate}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 25px rgb(15 23 42 / 0.08)',
  fontSize: 12,
};

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-[12px] font-extrabold uppercase tracking-wide text-slate-800">{title}</h2>
      <p className="mt-1 text-[12px] font-medium text-slate-500">{description}</p>
    </div>
  );
}

function EmptyChart() {
  return <div className="flex h-full items-center justify-center text-[13px] font-medium text-slate-400">Khong co du lieu</div>;
}

function KpiMeter({ label, value, color }: { label: string; value: number; color: string }) {
  const bounded = Math.max(0, Math.min(100, Math.round(value || 0)));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12px] font-bold text-slate-700">{label}</span>
        <span className="text-[12px] font-extrabold text-slate-900">{bounded}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${bounded}%` }} />
      </div>
    </div>
  );
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
  tone: 'blue' | 'red' | 'emerald';
}) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  };

  return (
    <div className="enterprise-panel p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md border', tones[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-[24px] font-black leading-none tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
