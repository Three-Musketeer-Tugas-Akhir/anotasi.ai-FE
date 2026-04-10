'use client';
import { useEffect } from 'react';
import { Video as VideoIcon, Scissors, FileText, Package, ArrowRight, Clock, CheckCircle2, AlertCircle, Activity, ExternalLink, Shield, User } from 'lucide-react';
import { useTour } from '@/shared/components/tour';
import { globalSidebarTour } from '@/shared/components/sidebar/sidebar.tour';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/features/audit/audit-api';
import { useAuth } from '@/features/auth';
import type { AuditLogItem } from '@/features/audit/types';

const metrics = [
  { title: 'Total Video SIBI', value: '1,648', change: '+12 minggu ini', icon: VideoIcon, color: 'text-teal-600', bgColor: 'bg-teal-50', ring: 'ring-teal-100' },
  { title: 'Chunks Terekstrak', value: '24,891', change: '+342 hari ini', icon: Scissors, color: 'text-blue-600', bgColor: 'bg-blue-50', ring: 'ring-blue-100' },
  { title: 'Kalimat Teranotasi', value: '18,204', change: '73.1% selesai', icon: FileText, color: 'text-amber-600', bgColor: 'bg-amber-50', ring: 'ring-amber-100' },
  { title: 'Siap Export', value: '15,120', change: '60.7% dari total', icon: Package, color: 'text-emerald-600', bgColor: 'bg-emerald-50', ring: 'ring-emerald-100' },
];

const pipelineSteps = [
  { label: 'Klasifikasi', count: 1648, done: 1648, color: 'bg-teal-500' },
  { label: 'CV-1 Extract', count: 1648, done: 1420, color: 'bg-blue-500' },
  { label: 'ASR Transcribe', count: 1420, done: 1105, color: 'bg-indigo-500' },
  { label: 'Review & Anotasi', count: 1105, done: 892, color: 'bg-amber-500' },
  { label: 'Kurasi', count: 892, done: 756, color: 'bg-orange-500' },
  { label: 'Export Ready', count: 756, done: 756, color: 'bg-emerald-500' },
];

// ── Helpers ─────────────────────────────────────────────────────────

function getActivityIcon(action: string): { Icon: typeof Activity; color: string } {
  if (action.includes('login')) return { Icon: CheckCircle2, color: 'text-emerald-500 fill-emerald-50' };
  if (action.includes('failed') || action.includes('deactivated')) return { Icon: AlertCircle, color: 'text-red-500 fill-red-50' };
  if (action.includes('created') || action.includes('submitted')) return { Icon: Activity, color: 'text-blue-500 fill-blue-50' };
  if (action.includes('role_changed')) return { Icon: Shield, color: 'text-purple-500 fill-purple-50' };
  return { Icon: Clock, color: 'text-slate-500 fill-slate-50' };
}

function formatTimeAgo(iso: string): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Main Component ─────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth();

  // Sidebar tour: fires only on first-ever Dashboard visit
  const { startTour, activeTour, hasCompletedTour } = useTour();
  useEffect(() => {
    if (!activeTour && !hasCompletedTour(globalSidebarTour.id)) {
      const timer = setTimeout(() => {
        startTour(globalSidebarTour);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTour, hasCompletedTour, startTour]);

  // Fetch Audit Logs (new API: /admin/audit/logs)
  const { data: auditResponse, isLoading: isLoadingAudit, isError: isErrorAudit } = useQuery({
    queryKey: ['dashboard-audit-logs'],
    queryFn: () => auditApi.listLogs({ page: 1, page_size: 10 }),
    refetchInterval: 30000,
  });

  const isAdmin = user?.role === 'admin';
  const auditLogs: AuditLogItem[] = auditResponse?.items || [];

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

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m) => (
            <div key={m.title} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{m.title}</p>
                  <p className="text-3xl font-bold text-slate-800">{m.value}</p>
                  <p className={`text-xs mt-2 font-medium ${m.color.replace('text-', 'text-opacity-80 text-')}`}>{m.change}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ring-4 ${m.ring} ${m.bgColor}`}>
                  <m.icon size={24} className={m.color} />
                </div>
              </div>
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500 ${m.bgColor}`}></div>
            </div>
          ))}
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
              {pipelineSteps.map((step, i) => {
                const pct = step.count > 0 ? (step.done / step.count) * 100 : 0;
                return (
                  <div key={step.label} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        {i > 0 && <ArrowRight size={14} className="text-slate-300" />}
                        {step.label}
                      </div>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {step.done.toLocaleString()} / {step.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                      <div
                        className={`h-full ${step.color} rounded-full transition-all duration-1000 ease-out relative`}
                        style={{ width: `${pct}%` }}
                      >
                         <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Feed (Audit Log) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[420px]">
            <div className="p-5 border-b border-gray-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Aktivitas Sistem</h2>
              {isAdmin && (
                <a
                  href="/audit"
                  className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1"
                >
                  Lihat Detail <ExternalLink size={10} />
                </a>
              )}
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                {isLoadingAudit ? (
                  <div className="text-sm text-slate-500 pl-4">Memuat aktivitas...</div>
                ) : isErrorAudit ? (
                  <div className="text-sm text-red-500 pl-4">Gagal memuat log aktivitas.</div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-sm text-slate-500 pl-4">Belum ada aktivitas terekam.</div>
                ) : (
                  auditLogs.map((log) => {
                    const { Icon, color } = getActivityIcon(log.action);
                    const timeStr = formatTimeAgo(log.timestamp);

                    return (
                      <div key={log.id} className="relative pl-6">
                        <span className="absolute -left-[11px] top-1 bg-white p-0.5 rounded-full">
                          <Icon size={16} className={color} />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700 leading-snug">
                            {isAdmin && log.actor ? (
                              <>
                                <span className="font-bold">{log.actor.email || 'System'}</span>{' '}
                                {log.action_label.toLowerCase()}
                              </>
                            ) : (
                              log.action_label
                            )}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">{timeStr}</span>
                            <span className="text-[10px] font-mono text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">
                              {log.resource.type}
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

        {/* Bottom Section: Completion Rings */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-800 mb-6 border-b border-gray-100 pb-4">Tingkat Konversi per Tahapan</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {pipelineSteps.map((step) => {
              const pct = step.count > 0 ? Math.round((step.done / step.count) * 100) : 0;
              const strokeDasharray = `${pct * 1.13} 113`;
              return (
                <div key={step.label} className="flex flex-col items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90 drop-shadow-sm" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                      <circle
                        cx="22" cy="22" r="18" fill="none"
                        className={step.color.replace('bg-', 'stroke-')}
                        strokeWidth="4"
                        strokeDasharray={strokeDasharray}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800">
                      {pct}%
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 font-semibold text-center leading-tight">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </>
  );
}
