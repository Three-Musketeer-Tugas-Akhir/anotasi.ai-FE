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

const ICON_MAP: Record<string, typeof VideoIcon> = {
  video: VideoIcon,
  scissors: Scissors,
  'file-text': FileText,
  package: Package,
};

const STAT_STYLES = [
  { color: 'text-teal-600', bgColor: 'bg-teal-50', border: 'border-teal-100' },
  { color: 'text-blue-600', bgColor: 'bg-blue-50', border: 'border-blue-100' },
  { color: 'text-amber-600', bgColor: 'bg-amber-50', border: 'border-amber-100' },
  { color: 'text-emerald-600', bgColor: 'bg-emerald-50', border: 'border-emerald-100' },
];

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

function getActivityIcon(action: string): { Icon: typeof Activity; color: string } {
  if (action.includes('login')) return { Icon: CheckCircle2, color: 'text-emerald-500' };
  if (action.includes('failed') || action.includes('deactivated')) return { Icon: AlertCircle, color: 'text-red-400' };
  if (action.includes('created') || action.includes('submitted')) return { Icon: Activity, color: 'text-blue-500' };
  return { Icon: Clock, color: 'text-slate-400' };
}

function formatTimeAgo(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}j lalu`;
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedDataset } = useSelectedDataset();
  const isAdmin = user?.role === 'admin';
  const isAnnotator = user?.role === 'annotator';
  const isCurator = user?.role === 'curator';

  const { startTour, activeTour, hasCompletedTour } = useTour();
  useEffect(() => {
    if (!selectedDataset) return;
    if (!activeTour && !hasCompletedTour(globalSidebarTour.id)) {
      const timer = setTimeout(() => startTour(globalSidebarTour), 300);
      return () => clearTimeout(timer);
    }
  }, [activeTour, hasCompletedTour, startTour, selectedDataset]);

  const { data: dashboard, isLoading, isError } = useQuery({
    queryKey: ['dashboard', selectedDataset?.id],
    queryFn: () => dashboardApi.getDashboard(selectedDataset?.id),
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled: isAdmin,
  });

  if (isAnnotator) return <AnnotatorDashboard />;
  if (isCurator) return <CuratorDashboard />;

  const stats: DashboardStatsCard[] = dashboard?.stats ?? [];
  const pipelineStages: DashboardPipelineStage[] = dashboard?.pipeline_progress ?? [];
  const activities: DashboardSystemActivity[] = dashboard?.system_activities ?? [];

  return (
    <>
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 h-12 flex items-center justify-between px-5 flex-shrink-0 shadow-sm z-10">
        <h1 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Activity className="text-blue-500" size={15} />
          Dashboard Admin
        </h1>
        <span className="text-[11px] text-slate-400">
          {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
            <Skeleton className="h-52 rounded-lg" />
            <Skeleton className="h-44 rounded-lg" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <AlertCircle className="text-red-500 mx-auto mb-1.5" size={22} />
            <p className="text-sm text-red-700 font-medium">Gagal memuat data dashboard</p>
            <p className="text-xs text-red-400 mt-0.5">Pastikan Anda memiliki akses admin dan backend berjalan.</p>
          </div>
        )}

        {dashboard && (
          <>
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.map((stat, idx) => {
                const style = STAT_STYLES[idx % STAT_STYLES.length];
                const IconComp = ICON_MAP[stat.icon] || VideoIcon;
                return (
                  <div key={stat.label} className={`bg-white rounded-lg border ${style.border} shadow-sm p-3.5 flex items-center gap-3`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bgColor}`}>
                      <IconComp size={18} className={style.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-400 truncate">{stat.label}</p>
                      <p className="text-xl font-bold text-slate-800 leading-tight">{stat.value.toLocaleString('id-ID')}</p>
                      <p className={`text-[10px] font-medium truncate ${style.color}`}>{stat.sublabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Pipeline + Activity ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

              {/* Pipeline Progress */}
              <div className="xl:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="text-sm font-bold text-slate-700">Pipeline Progress</h2>
                  <a href="/pipeline" className="text-[11px] text-blue-500 font-semibold hover:underline flex items-center gap-0.5">
                    Detail <ExternalLink size={10} />
                  </a>
                </div>
                <div className="p-4 space-y-3">
                  {pipelineStages.map((stage, i) => (
                    <div key={stage.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          {i > 0 && <ArrowRight size={11} className="text-slate-300" />}
                          {stage.name}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {stage.current.toLocaleString()} / {stage.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getPipelineColor(stage.color)} rounded-full transition-all duration-700`}
                          style={{ width: `${stage.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Feed */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col max-h-72 xl:max-h-none">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-slate-50/50 flex-shrink-0">
                  <h2 className="text-sm font-bold text-slate-700">Aktivitas Sistem</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {activities.length === 0 ? (
                    <p className="text-xs text-slate-400 px-1 py-2">Belum ada aktivitas.</p>
                  ) : (
                    <div className="space-y-2">
                      {activities.map((activity, idx) => {
                        const { Icon, color } = getActivityIcon(activity.action);
                        return (
                          <div key={`${activity.action}-${idx}`} className="flex items-start gap-2">
                            <Icon size={13} className={`mt-0.5 flex-shrink-0 ${color}`} />
                            <div className="min-w-0">
                              <p className="text-xs text-slate-700 leading-snug">{activity.description}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{formatTimeAgo(activity.timestamp)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </>
        )}

      </div>
    </>
  );
}
