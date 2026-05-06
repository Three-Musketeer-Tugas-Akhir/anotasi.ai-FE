'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatasetExplorer } from './dataset-explorer';

import {
  Package,
  Download,
  Loader2,
  Calendar,
  Filter,
  FileArchive,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
  Search,
  Clock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/axios-client';


// ── Types ──────────────────────────────────────────────────────────

interface ExportableJob {
  id: string;
  original_filename?: string;
  status: string;
  category: string | null;
  curation_status: string | null;
  total_segments: number;
  created_at: string | null;
  updated_at: string | null;
}

interface JobListResponse {
  items: ExportableJob[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Helpers ────────────────────────────────────────────────────────

const DOWNLOADABLE_STATUSES = new Set([
  'PENDING',
  'ANNOTATED',
  'READY_TO_BE_NORMALIZED',
  'NORMALIZED',
  'READY_TO_EXPORT',
]);

function getCurationBadge(status: string | null): { label: string; className: string } {
  switch (status) {
    case 'PENDING':
      return { label: 'Sedang Dianotasi', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'ANNOTATED':
      return { label: 'Selesai Dianotasi', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'READY_TO_BE_NORMALIZED':
      return { label: 'Siap Normalisasi', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'NORMALIZED':
      return { label: 'Ternormalisasi', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'READY_TO_EXPORT':
      return { label: 'Siap Export', className: 'bg-teal-50 text-teal-700 border-teal-200' };
    default:
      return { label: status || 'Belum Siap', className: 'bg-slate-50 text-slate-500 border-slate-200' };
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Component ──────────────────────────────────────────────────────

export function ExportPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [exploreJobId, setExploreJobId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['export-jobs', dateFrom, dateTo],
    queryFn: async () => {
      const response = await apiClient.get<JobListResponse>('/pipeline/jobs', {
        params: {
          page: 1,
          page_size: 100,
          status: 'READY_FOR_ANNOTATION',
          from_date: dateFrom || undefined,
          to_date: dateTo || undefined,
        },
      });
      return response.data;
    },
  });

  const jobs = data?.items ?? [];
  const downloadableJobs = jobs.filter(
    (j) => !search || (j.original_filename ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const totalDownloadable = jobs.length;
  const normalizedCount = jobs.filter(
    (j) => j.curation_status === 'NORMALIZED' || j.curation_status === 'READY_TO_EXPORT',
  ).length;

  const handleDownload = useCallback(async (jobId: string) => {
    setDownloadingId(jobId);
    try {
      const response = await apiClient.get(
        `/pipeline/jobs/${jobId}/dataset/download`,
        { responseType: 'blob' },
      );
      const disposition = (response.headers['content-disposition'] as string) || '';
      const match = disposition.match(/filename[^;=\n]*=([^;\n]*)/);
      const filename = match ? match[1].replace(/[\"']/g, '').trim() : `dataset_${jobId.slice(0, 8)}.zip`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Gagal mengunduh dataset. Pastikan Anda sudah login.');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  if (exploreJobId) {
    return <DatasetExplorer jobId={exploreJobId} onBack={() => setExploreJobId(null)} />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-y-auto p-6 md:p-8 space-y-6">

      {/* ── Header with Compact Insights ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package size={24} className="text-teal-600" />
            Dataset Export
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Unduh dataset ZIP yang berisi video, audio WAV, dan transkrip dari pipeline yang sudah selesai.
          </p>
        </div>

        {/* Compact Insight Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex bg-white border border-slate-200 rounded-xl shadow-sm divide-x divide-slate-100 overflow-hidden">
            <div className="px-4 py-2.5 text-center">
              <p className="text-lg font-bold text-slate-800 leading-none">{totalDownloadable}</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mt-1">Total Siap</p>
            </div>
            <div className="px-4 py-2.5 text-center">
              <p className="text-lg font-bold text-teal-600 leading-none">{normalizedCount}</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mt-1">Dinormalisasi</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-10 px-3 border-slate-200">
            <RefreshCw size={14} className="mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Main Content Card ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">

        {/* ── Unified Filter Toolbar ── */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama file..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 w-full sm:w-auto">
              <Calendar size={14} className="text-slate-400 flex-shrink-0" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border-none shadow-none p-0 h-auto text-xs focus-visible:ring-0 w-32"
                placeholder="Dari"
              />
              <span className="text-slate-300">–</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border-none shadow-none p-0 h-auto text-xs focus-visible:ring-0 w-32"
                placeholder="Sampai"
              />
            </div>
            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors flex-shrink-0">
              <Filter size={15} />
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-teal-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertTriangle size={28} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-red-600">Gagal memuat data</p>
          </div>
        ) : downloadableJobs.length === 0 ? (
          <div className="p-16 text-center">
            <FileArchive size={40} className="text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-500">
              {search ? 'Tidak ada hasil yang cocok' : 'Belum ada dataset yang siap didownload'}
            </p>
            <p className="text-xs text-slate-400 mt-1.5">
              {search ? 'Coba ubah kata kunci pencarian.' : 'Dataset tersedia setelah kurator melakukan approve dan/atau normalisasi.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5 w-12 text-center">#</th>
                  <th className="px-6 py-3.5">Nama File Dataset</th>
                  <th className="px-6 py-3.5 w-32 text-center">Kategori</th>
                  <th className="px-6 py-3.5 w-44 text-center">Status Kurasi</th>
                  <th className="px-6 py-3.5 w-36 text-center">Tanggal</th>
                  <th className="px-6 py-3.5 w-48 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {downloadableJobs.map((job, i) => {
                  const badge = getCurationBadge(job.curation_status);
                  const isDownloading = downloadingId === job.id;
                  const isDownloadable = !!(job.curation_status && DOWNLOADABLE_STATUSES.has(job.curation_status));

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 text-center text-slate-400 font-medium text-xs">{i + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span
                            className="font-semibold text-slate-800 line-clamp-1 max-w-sm"
                            title={job.original_filename}
                          >
                            {job.original_filename || 'Unknown File'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 mt-0.5">
                            ID: {job.id.slice(0, 8)}...
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {job.category ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                            {job.category}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold border shadow-sm ${badge.className}`}>
                          {(job.curation_status === 'NORMALIZED' || job.curation_status === 'READY_TO_EXPORT')
                            ? <CheckCircle2 size={10} />
                            : <Clock size={10} />
                          }
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-slate-500 font-medium">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                            onClick={() => setExploreJobId(job.id)}
                          >
                            <FolderOpen size={13} className="mr-1.5" /> Explorer
                          </button>
                          <button
                            disabled={isDownloading || !isDownloadable}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                            onClick={() => handleDownload(job.id)}
                            title={!isDownloadable ? 'Belum siap untuk diunduh' : 'Download dataset ZIP'}
                          >
                            {isDownloading ? (
                              <><Loader2 size={13} className="mr-1.5 animate-spin" /> Mengunduh...</>
                            ) : (
                              <><Download size={13} className="mr-1.5" /> ZIP</>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
