'use client';

import { useQuery } from '@tanstack/react-query';
import {
    CheckCircle2, Clock, AlertCircle, Loader2,
    FileVideo, PenTool, Calendar, ChevronRight, Sparkles
} from 'lucide-react';
import { dashboardApi, type AnnotatorDashboardResponse } from '../dashboard-api';
import { useSelectedDataset } from '@/features/dataset/context/dataset-context';

// ── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
}

function getQueueBadge(status: string) {
    switch (status) {
        case 'COMPLETED':
            return { label: 'Selesai', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        case 'IN_PROGRESS':
            return { label: 'Sedang Dikerjakan', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
        default:
            return { label: 'Tugas Baru', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
}

// ── Circular progress ring (Light Theme) ────────────────────────────

function ProgressRing({ percent, size = 120 }: { percent: number; size?: number }) {
    const r = (size - 16) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (percent / 100) * circ;
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90 drop-shadow-sm">
                {/* Track background */}
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                {/* Progress fill */}
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke="url(#ring-grad)" strokeWidth="10"
                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                />
                <defs>
                    <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0ea5e9" /> {/* sky-500 */}
                        <stop offset="100%" stopColor="#14b8a6" /> {/* teal-500 */}
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-800">{Math.round(percent)}%</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Selesai</span>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────

export function AnnotatorDashboard() {
    const { selectedDataset } = useSelectedDataset();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['my-dashboard', selectedDataset?.id],
        queryFn: () => dashboardApi.getMyDashboard(selectedDataset?.id),
        staleTime: 60_000,
        refetchInterval: 60_000,
        select: (d) => d as AnnotatorDashboardResponse,
    });

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <Loader2 className="animate-spin text-teal-500 mr-2" size={24} />
                <span className="text-slate-500 font-medium">Memuat tugas Anda...</span>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="text-red-500 mx-auto mb-2" size={32} />
                    <p className="text-sm text-red-700 font-medium">Gagal memuat tugas.</p>
                    <p className="text-xs text-red-500 mt-1">Coba muat ulang halaman ini.</p>
                </div>
            </div>
        );
    }

    const { stats, jobs } = data;
    const totalSelesai = stats.completed_segments;

    return (
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">

            {/* ── Greeting ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-amber-500" size={24} />
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Halo, Semangat bekerja hari ini!</h1>
                    <p className="text-sm text-slate-500">Berikut adalah ringkasan progres dan tugas anotasi Anda.</p>
                </div>
            </div>

            {/* ── Hero section (White Card, Light Theme) ────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 lg:p-8 flex flex-col lg:flex-row items-center gap-8">

                    {/* Progress ring */}
                    <div className="flex-shrink-0 bg-slate-50 p-4 rounded-full border border-slate-100">
                        <ProgressRing percent={stats.overall_progress_percent} size={140} />
                    </div>

                    {/* Stats grid */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                        {[
                            { label: 'Total Kalimat', value: stats.total_segments, icon: <FileVideo size={20} className="text-slate-600" />, bgIcon: 'bg-slate-100' },
                            { label: 'Sudah Selesai', value: stats.completed_segments, icon: <CheckCircle2 size={20} className="text-emerald-600" />, bgIcon: 'bg-emerald-100' },
                            { label: 'Sedang Dikerjakan', value: stats.in_progress_segments, icon: <PenTool size={20} className="text-blue-600" />, bgIcon: 'bg-blue-100' },
                            { label: 'Belum Dimulai', value: stats.pending_segments, icon: <Clock size={20} className="text-amber-600" />, bgIcon: 'bg-amber-100' },
                        ].map((s) => (
                            <div key={s.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col items-center text-center">
                                <div className={`w-10 h-10 rounded-full ${s.bgIcon} flex items-center justify-center mb-3`}>
                                    {s.icon}
                                </div>
                                <p className="text-2xl font-bold text-slate-800 mb-1">{s.value.toLocaleString('id-ID')}</p>
                                <span className="text-xs font-semibold text-slate-500">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Progress bar di bawah */}
                <div className="px-6 lg:px-8 pb-6 pt-2 border-t border-gray-100 bg-slate-50/50">
                    <div className="flex justify-between text-sm font-medium text-slate-600 mb-2 mt-4">
                        <span>Progres Keseluruhan Anda</span>
                        <span className="text-teal-600">{totalSelesai} dari {stats.total_segments} kalimat selesai</span>
                    </div>
                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-sky-400 to-teal-500"
                            style={{ width: `${stats.overall_progress_percent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Job list ──────────────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-4 mt-8">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        Daftar Tugas Anda
                    </h2>
                    <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100">
                        {jobs.length} Tugas Tersedia
                    </span>
                </div>

                {jobs.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={40} className="text-slate-300" />
                        </div>
                        <p className="text-base font-bold text-slate-700">Tidak ada tugas saat ini.</p>
                        <p className="text-sm text-slate-500 mt-1">Anda sudah menyelesaikan semua tugas atau menunggu tugas baru dari Admin.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {jobs.map((job) => {
                            const badge = getQueueBadge(job.queue_status);
                            return (
                                <div
                                    key={job.job_id}
                                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-teal-300 hover:shadow-md transition-all group flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Filename + badge */}
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <h3 className="text-base font-bold text-slate-800 leading-tight">
                                                {job.original_filename}
                                            </h3>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-md border whitespace-nowrap ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        </div>

                                        {/* Meta */}
                                        <div className="flex flex-col gap-2 text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <span className="flex items-center gap-2">
                                                <Calendar size={16} className="text-slate-400" />
                                                Ditugaskan: <strong className="text-slate-700">{formatDate(job.assigned_at)}</strong>
                                            </span>
                                            {job.due_date && (
                                                <span className="flex items-center gap-2">
                                                    <Clock size={16} className="text-amber-500" />
                                                    Tenggat Waktu: <strong className="text-amber-600">{formatDate(job.due_date)}</strong>
                                                </span>
                                            )}
                                        </div>

                                        {/* Progress bar per job */}
                                        <div className="space-y-2 mb-6">
                                            <div className="flex justify-between text-xs font-medium text-slate-600">
                                                <span>Progres tugas ini</span>
                                                <span>{job.completed_segments} / {job.total_segments} kalimat</span>
                                            </div>
                                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden inset-shadow-sm">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${job.progress_percent}%`,
                                                        backgroundColor: job.queue_status === 'COMPLETED' ? '#10b981' : '#14b8a6',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button - Besar dan Jelas */}
                                    <a
                                        href="/annotation"
                                        className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-3 rounded-xl transition-colors shadow-sm"
                                    >
                                        {job.queue_status === 'COMPLETED' ? 'Lihat Kembali' : 'Buka & Kerjakan'}
                                        <ChevronRight size={18} />
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}
