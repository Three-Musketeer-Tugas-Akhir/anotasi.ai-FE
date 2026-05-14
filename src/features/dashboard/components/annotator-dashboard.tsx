'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, Clock, AlertCircle, Loader2, ArrowRight,
  FileVideo, PenTool, TrendingUp, Calendar, ChevronRight,
} from 'lucide-react';
import { dashboardApi, type AnnotatorDashboardResponse } from '../dashboard-api';

// ── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function getQueueBadge(status: string) {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Selesai', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'IN_PROGRESS':
      return { label: 'Dikerjakan', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
    default:
      return { label: 'Ditugaskan', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
}

// ── Circular progress ring ───────────────────────────────────────────

function ProgressRing({ percent, size = 120 }: { percent: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#ring-grad)" strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{Math.round(percent)}%</span>
        <span className="text-[10px] text-slate-400 font-medium">Selesai</span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function AnnotatorDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-dashboard'],
    queryFn: dashboardApi.getMyDashboard,
    staleTime: 60_000,
    refetchInterval: 60_000,
    select: (d) => d as AnnotatorDashboardResponse,
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
  const totalSelesai = stats.completed_segments;
  const totalBelum = stats.pending_segments + stats.in_progress_segments;

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-slate-950">

      {/* ── Hero section ──────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #134e4a 100%)', border: '1px solid rgba(20,184,166,0.2)' }}>
        <div className="p-6 lg:p-8 flex flex-col lg:flex-row items-start lg:items-center gap-8">

          {/* Progress ring */}
          <div className="flex-shrink-0">
            <ProgressRing percent={stats.overall_progress_percent} size={130} />
          </div>

          {/* Stats grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Kalimat', value: stats.total_segments, icon: <FileVideo size={18} />, color: 'text-slate-300' },
              { label: 'Selesai', value: stats.completed_segments, icon: <CheckCircle2 size={18} />, color: 'text-emerald-400' },
              { label: 'Sedang Dikerjakan', value: stats.in_progress_segments, icon: <PenTool size={18} />, color: 'text-blue-400' },
              { label: 'Belum Dimulai', value: stats.pending_segments, icon: <Clock size={18} />, color: 'text-amber-400' },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className={`flex items-center gap-1.5 mb-2 ${s.color}`}>
                  {s.icon}
                  <span className="text-xs font-semibold">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{s.value.toLocaleString('id-ID')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 lg:px-8 pb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Progress Keseluruhan</span>
            <span>{totalSelesai} / {stats.total_segments} kalimat</span>
          </div>
          <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${stats.overall_progress_percent}%`,
                background: 'linear-gradient(90deg, #14b8a6, #06b6d4)',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Job list ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-400" />
            Daftar Job Ditugaskan
          </h2>
          <span className="text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700">
            {jobs.length} job
          </span>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <FileVideo size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Belum ada job yang ditugaskan.</p>
            <p className="text-xs text-slate-600 mt-1">Hubungi admin untuk mendapatkan tugas anotasi.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const badge = getQueueBadge(job.queue_status);
              return (
                <div
                  key={job.job_id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 hover:border-teal-800/60 hover:bg-slate-900 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Filename + badge */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-200 truncate max-w-xs">
                          {job.original_filename}
                        </h3>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          Ditugaskan {formatDate(job.assigned_at)}
                        </span>
                        {job.due_date && (
                          <span className="flex items-center gap-1 text-amber-500">
                            <Clock size={11} />
                            Tenggat {formatDate(job.due_date)}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Progress segmen</span>
                          <span className="font-mono">{job.completed_segments}/{job.total_segments}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${job.progress_percent}%`,
                              background: job.queue_status === 'COMPLETED'
                                ? 'linear-gradient(90deg, #10b981, #34d399)'
                                : 'linear-gradient(90deg, #14b8a6, #06b6d4)',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <a
                      href="/annotation"
                      className="flex-shrink-0 flex items-center gap-1.5 bg-teal-700/20 hover:bg-teal-600/30 text-teal-400 hover:text-teal-300 text-xs font-semibold px-3 py-2 rounded-lg border border-teal-700/40 transition-colors"
                    >
                      Buka
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
