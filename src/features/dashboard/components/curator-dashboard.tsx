'use client';

import { useQuery } from '@tanstack/react-query';
import {
    CheckCircle2, Clock, AlertCircle, Loader2,
    FileVideo, Search, TrendingUp, ChevronRight, BookOpen, Sparkles,
} from 'lucide-react';
import { dashboardApi, type CuratorDashboardResponse } from '../dashboard-api';
import { useSelectedDataset } from '@/features/dataset/context/dataset-context';

// ── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
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
    const { selectedDataset } = useSelectedDataset();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['my-dashboard', selectedDataset?.id],
        queryFn: () => dashboardApi.getMyDashboard(selectedDataset?.id),
        staleTime: 60_000,
        refetchInterval: 60_000,
        select: (d) => d as CuratorDashboardResponse,
    });

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <Loader2 className="animate-spin text-violet-500 mr-2" size={24} />
                <span className="text-slate-500 font-medium">Memuat tugas Anda...</span>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="text-red-500 mx-auto mb-2" size={32} />
                    <p className="text-sm text-red-700 font-medium">Gagal memuat data dashboard.</p>
                    <p className="text-xs text-red-500 mt-1">Coba muat ulang halaman ini.</p>
                </div>
            </div>
        );
    }

    const { stats, jobs } = data;

    return (
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">

            {/* ── Greeting ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center border border-violet-200">
                    <BookOpen size={20} className="text-violet-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        Antrian Kurasi
                        <Sparkles className="text-violet-400" size={18} />
                    </h1>
                    <p className="text-sm text-slate-500">Job yang memerlukan perhatian dan tindakan Anda.</p>
                </div>
            </div>

            {/* ── Hero / Stats Card (Light Theme, Violet Accent) ────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 lg:px-8 py-4 border-b border-gray-100 bg-violet-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-violet-600" />
                        <span className="text-sm font-bold text-violet-800">Ringkasan Status Kurasi</span>
                    </div>
                    <span className="text-xs font-semibold text-violet-700 bg-violet-100 px-3 py-1 rounded-full border border-violet-200">
                        {stats.total_jobs} Total Job
                    </span>
                </div>

                {/* Stats grid */}
                <div className="p-6 lg:p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        {
                            label: 'Total Job',
                            value: stats.total_jobs,
                            icon: <FileVideo size={20} className="text-slate-600" />,
                            bgIcon: 'bg-slate-100',
                        },
                        {
                            label: 'Perlu Ditinjau',
                            value: stats.pending_review,
                            icon: <AlertCircle size={20} className="text-amber-600" />,
                            bgIcon: 'bg-amber-100',
                        },
                        {
                            label: 'Sedang Dinormalisasi',
                            value: stats.in_normalization,
                            icon: <Clock size={20} className="text-violet-600" />,
                            bgIcon: 'bg-violet-100',
                        },
                        {
                            label: 'Selesai',
                            value: stats.completed_normalization,
                            icon: <CheckCircle2 size={20} className="text-emerald-600" />,
                            bgIcon: 'bg-emerald-100',
                        },
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

            {/* ── Job queue list ────────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-4 mt-8">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        Daftar Job dalam Antrian Kurasi
                    </h2>
                    <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-3 py-1.5 rounded-full border border-violet-100">
                        {jobs.length} Job Tersedia
                    </span>
                </div>

                {jobs.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={40} className="text-slate-300" />
                        </div>
                        <p className="text-base font-bold text-slate-700">Tidak ada job dalam antrian kurasi.</p>
                        <p className="text-sm text-slate-500 mt-1">Job akan muncul di sini setelah proses anotasi selesai.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {jobs.map((job) => {
                            const badge = getCurationBadge(job.curation_status);
                            return (
                                <div
                                    key={job.job_id}
                                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-violet-300 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">

                                            {/* Badge + filename */}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                {/* Animated ping dot */}
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${badge.dot} opacity-60`} />
                                                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${badge.dot}`} />
                                                </span>
                                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                                                    {badge.label}
                                                </span>
                                                <h3 className="text-sm font-semibold text-slate-700 truncate max-w-xs">
                                                    {job.original_filename}
                                                </h3>
                                            </div>

                                            {/* Meta */}
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <FileVideo size={11} className="text-slate-400" />
                                                    {job.total_segments} segmen
                                                </span>
                                                <span>·</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={11} className="text-slate-400" />
                                                    Diperbarui {formatDate(job.updated_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action */}
                                        <a
                                            href="/curation"
                                            className="flex-shrink-0 flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
                                        >
                                            Buka Kurasi
                                            <ChevronRight size={14} />
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
