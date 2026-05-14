'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, Clock, AlertCircle, Loader2,
  FileVideo, Search, TrendingUp, ChevronRight, BookOpen,
} from 'lucide-react';
import { dashboardApi, type CuratorDashboardResponse } from '../dashboard-api';

// ── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function getCurationBadge(status: string) {
  switch (status) {
    case 'ANNOTATED':
      return { label: 'Menunggu Kurasi', cls: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400' };
    case 'READY_TO_BE_NORMALIZED':
      return { label: 'Siap Normalisasi', cls: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-400' };
    case 'NORMALIZING':
      return { label: 'Sedang Dinormalisasi', cls: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-400' };
    case 'NORMALIZED':
      return { label: 'Selesai Dinormalisasi', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' };
    case 'READY_TO_EXPORT':
      return { label: 'Siap Ekspor', cls: 'bg-teal-100 text-teal-700 border-teal-200', dot: 'bg-teal-400' };
    default:
      return { label: status, cls: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  }
}

// ── Main Component ─────────────────────────────────────────────────

export function CuratorDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-dashboard'],
    queryFn: dashboardApi.getMyDashboard,
    staleTime: 60_000,
    refetchInterval: 60_000,
    select: (d) => d as CuratorDashboardResponse,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="animate-spin text-teal-400 mr-2" size={24} />
        <span className="text-slate-400">Memuat dashboard...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="text-red-400 mx-auto mb-2" size={32} />
          <p className="text-sm text-slate-400">Gagal memuat data dashboard.</p>
        </div>
      </div>
    );
  }

  const { stats, jobs } = data;

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-slate-950">

      {/* ── Hero / Stats ──────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 lg:p-8"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          border: '1px solid rgba(139,92,246,0.25)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
            <BookOpen size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Antrian Kurasi</h2>
            <p className="text-xs text-slate-400">Job yang memerlukan perhatian Anda</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Job',
              value: stats.total_jobs,
              icon: <FileVideo size={18} />,
              color: 'text-slate-300',
              bg: 'bg-white/5',
            },
            {
              label: 'Perlu Ditinjau',
              value: stats.pending_review,
              icon: <AlertCircle size={18} />,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
            },
            {
              label: 'Sedang Dinormalisasi',
              value: stats.in_normalization,
              icon: <Clock size={18} />,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10',
            },
            {
              label: 'Selesai',
              value: stats.completed_normalization,
              icon: <CheckCircle2 size={18} />,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
            },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-white/10`}>
              <div className={`flex items-center gap-1.5 mb-2 ${s.color}`}>
                {s.icon}
                <span className="text-xs font-semibold">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{s.value.toLocaleString('id-ID')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Job queue list ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-violet-400" />
            Daftar Job dalam Antrian Kurasi
          </h2>
          <span className="text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700">
            {jobs.length} job
          </span>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <Search size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Tidak ada job dalam antrian kurasi.</p>
            <p className="text-xs text-slate-600 mt-1">Job akan muncul di sini setelah anotasi selesai.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const badge = getCurationBadge(job.curation_status);
              return (
                <div
                  key={job.job_id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 hover:border-violet-800/60 hover:bg-slate-900 transition-all group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">

                      {/* Badge + filename */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="relative flex h-2 w-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${badge.dot} opacity-60`} />
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${badge.dot}`} />
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-200 truncate max-w-xs">
                          {job.original_filename}
                        </h3>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{job.total_segments} segmen</span>
                        <span>·</span>
                        <span>Diperbarui {formatDate(job.updated_at)}</span>
                      </div>
                    </div>

                    {/* Action */}
                    <a
                      href="/curation"
                      className="flex-shrink-0 flex items-center gap-1.5 bg-violet-700/20 hover:bg-violet-600/30 text-violet-400 hover:text-violet-300 text-xs font-semibold px-3 py-2 rounded-lg border border-violet-700/40 transition-colors"
                    >
                      Buka Kurasi
                      <ChevronRight size={13} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
