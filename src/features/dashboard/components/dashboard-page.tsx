'use client';
import { useEffect } from 'react';
import { Video as VideoIcon, Scissors, FileText, Package, ArrowRight, Clock, CheckCircle2, AlertCircle, Activity, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { useTour } from '@/shared/components/tour';
import { globalSidebarTour } from '@/shared/components/sidebar/sidebar.tour';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useSelectedDataset } from '@/features/dataset/context/dataset-context';
import { dashboardApi } from '../dashboard-api';
import type { DashboardStatsCard, DashboardPipelineStage, DashboardSystemActivity } from '../dashboard-api';
import { AnnotatorDashboard } from './annotator-dashboard';
import { CuratorDashboard } from './curator-dashboard';

// ── Icon mapping from API string → Lucide component ────────────────

const ICON_MAP: Record<string, typeof VideoIcon> = {
  video: VideoIcon,
  scissors: Scissors,
  'file-text': FileText,
  package: Package,
};

// ── Color mapping per stat index (stable across data changes) ──────

const STAT_STYLES = [
  { color: 'text-teal-600', bgColor: 'bg-teal-50', ring: 'ring-teal-100' },
  { color: 'text-blue-600', bgColor: 'bg-blue-50', ring: 'ring-blue-100' },
  { color: 'text-amber-600', bgColor: 'bg-amber-50', ring: 'ring-amber-100' },
  { color: 'text-emerald-600', bgColor: 'bg-emerald-50', ring: 'ring-emerald-100' },
];

// ── Pipeline color mapping from API color string → Tailwind class ──

const PIPELINE_COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  violet: 'bg-indigo-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
};

function getPipelineColor(color: string): string {
  return PIPELINE_COLOR_MAP[color] || 'bg-slate-500';
}

// ── Helpers ─────────────────────────────────────────────────────────

function getActivityIcon(action: string): { Icon: typeof Activity; color: string } {
  if (action.includes('login')) return { Icon: CheckCircle2, color: 'text-emerald-500 fill-emerald-50' };
  if (action.includes('failed') || action.includes('deactivated')) return { Icon: AlertCircle, color: 'text-red-500 fill-red-50' };
  if (action.includes('created') || action.includes('submitted')) return { Icon: Activity, color: 'text-blue-500 fill-blue-50' };
  return { Icon: Clock, color: 'text-slate-500 fill-slate-50' };
}

function formatTimeAgo(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit yang lalu`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} jam yang lalu`;

  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Main Component ─────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedDataset } = useSelectedDataset();
  const isAdmin = user?.role === 'admin';
  const isAnnotator = user?.role === 'annotator';
  const isCurator = user?.role === 'curator';

  // Sidebar tour: fires only on first-ever Dashboard visit
  // Must wait until a dataset is selected so it doesn't overlap with DatasetGate
  const { startTour, activeTour, hasCompletedTour } = useTour();
  useEffect(() => {
    if (!selectedDataset) return;
    
    if (!activeTour && !hasCompletedTour(globalSidebarTour.id)) {
      const timer = setTimeout(() => {
        startTour(globalSidebarTour);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTour, hasCompletedTour, startTour, selectedDataset]);

  // Admin dashboard data — hooks MUST be called unconditionally (Rules of Hooks)
  // enabled:isAdmin prevents actual API fetch for non-admin roles
  const {
    data: dashboard,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['dashboard', selectedDataset?.id],
    queryFn: () => dashboardApi.getDashboard(selectedDataset?.id),
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled: isAdmin,
  });

  // Non-admin roles: delegate to role-specific dashboards (after all hooks)
  if (isAnnotator) return <AnnotatorDashboard />;
  if (isCurator) return <CuratorDashboard />;

  const stats: DashboardStatsCard[] = dashboard?.stats ?? [];
  const pipelineStages: DashboardPipelineStage[] = dashboard?.pipeline_progress ?? [];
  const activities: DashboardSystemActivity[] = dashboard?.system_activities ?? [];

  return (
    <>
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 flex-shrink-0 shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-blue-500" size={20} />
            Dashboard
          </h1>
          <p className="text-xs text-slate-500">Ringkasan kesehatan pipeline dataset SIBI</p>
        </div>
        <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
          Hari ini: {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
        {/* ── Greeting (Standardized across roles) ──────────────────── */}
        {!isLoading && !isError && dashboard && (
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200">
              <Sparkles size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Ringkasan Pipeline Dataset</h1>
              <p className="text-sm text-slate-500">Pantau kesehatan data dan progres setiap tahapan secara real-time.</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="text-red-500 mx-auto mb-2" size={28} />
            <p className="text-sm text-red-700 font-medium">Gagal memuat data dashboard</p>
            <p className="text-xs text-red-500 mt-1">Pastikan Anda memiliki akses admin dan backend sedang berjalan.</p>
          </div>
        )}

        {/* Dashboard content (only when data is available) */}
        {dashboard && (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, idx) => {
                const style = STAT_STYLES[idx % STAT_STYLES.length];
                const IconComp = ICON_MAP[stat.icon] || VideoIcon;
                return (
                  <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
                        <p className="text-3xl font-bold text-slate-800">{stat.value.toLocaleString('id-ID')}</p>
                        <p className={`text-xs mt-2 font-medium ${style.color}`}>{stat.sublabel}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ring-4 ${style.ring} ${style.bgColor} transition-transform group-hover:scale-110 duration-300`}>
                        <IconComp size={24} className={style.color} />
                      </div>
                    </div>
                    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500 ${style.bgColor}`}></div>
                  </div>
                );
              })}
            </div>

            {/* Middle Section: Progress & Activity */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* Pipeline Progress */}
              <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="text-base font-bold text-slate-800">Pipeline Progress Tracker</h2>
                  <a href="/pipeline" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                    Lihat Detail <ExternalLink size={10} />
                  </a>
                </div>
                <div className="p-6 space-y-5 flex-1 flex flex-col justify-center">
                  {pipelineStages.map((stage, i) => (
                    <div key={stage.name} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          {i > 0 && <ArrowRight size={14} className="text-slate-300" />}
                          {stage.name}
                        </div>
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {stage.current.toLocaleString()} / {stage.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                        <div
                          className={`h-full ${getPipelineColor(stage.color)} rounded-full transition-all duration-1000 ease-out relative`}
                          style={{ width: `${stage.percentage}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Feed */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[420px]">
                <div className="p-5 border-b border-gray-100 bg-slate-50/50 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-800">Aktivitas Sistem</h2>
                </div>
                <div className="p-5 flex-1 overflow-y-auto">
                  <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                    {activities.length === 0 ? (
                      <div className="text-sm text-slate-500 pl-4">Belum ada aktivitas terekam.</div>
                    ) : (
                      activities.map((activity, idx) => {
                        const { Icon, color } = getActivityIcon(activity.action);
                        const timeStr = formatTimeAgo(activity.timestamp);

                        return (
                          <div key={`${activity.action}-${idx}`} className="relative pl-6">
                            <span className="absolute -left-[11px] top-1 bg-white p-0.5 rounded-full">
                              <Icon size={16} className={color} />
                            </span>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-700 leading-snug">
                                {activity.description}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-400">{timeStr}</span>
                                <span className="text-[10px] font-mono text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">
                                  {activity.action}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

          </>
        )}

      </div>
    </>
  );
}
