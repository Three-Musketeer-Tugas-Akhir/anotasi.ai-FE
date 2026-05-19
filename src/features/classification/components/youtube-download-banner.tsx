'use client';

import { Film, CheckCircle2, AlertTriangle, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useYoutubeDownloads } from '@/features/classification/context/youtube-download-context';

export type YTStatus =
  | 'pending'
  | 'extracting_info'
  | 'downloading'
  | 'uploading_to_storage'
  | 'creating_job'
  | 'completed'
  | 'failed';

export interface YTDownloadState {
  downloadId: string;
  status: YTStatus;
  title: string | null;
  percent: number;
  speed: string | null;
  eta: string | null;
  error: string | null;
  job_id: string | null;
}

function getYTStatusDisplay(status: YTStatus): { label: string; color: string } {
  switch (status) {
    case 'pending': return { label: 'Mempersiapkan...', color: 'text-gray-400' };
    case 'extracting_info': return { label: 'Mengambil info video...', color: 'text-blue-400' };
    case 'downloading': return { label: 'Mengunduh dari YouTube...', color: 'text-amber-400' };
    case 'uploading_to_storage': return { label: 'Menyimpan ke server...', color: 'text-indigo-400' };
    case 'creating_job': return { label: 'Membuat job pipeline...', color: 'text-teal-400' };
    case 'completed': return { label: 'Selesai!', color: 'text-emerald-400' };
    case 'failed': return { label: 'Gagal', color: 'text-red-400' };
    default: return { label: status, color: 'text-gray-400' };
  }
}

export function YTDownloadBanner() {
  const { downloads, dismissDownload } = useYoutubeDownloads();
  const [collapsed, setCollapsed] = useState(false);

  if (downloads.length === 0) return null;

  const activeCount = downloads.filter(
    (d) => d.status !== 'completed' && d.status !== 'failed',
  ).length;

  return (
    <div className="w-80 shadow-2xl rounded-xl overflow-hidden border border-white/10 bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-white/10">
        <div className="flex items-center gap-2">
          {activeCount > 0 ? (
            <Loader2 size={14} className="animate-spin text-teal-400" />
          ) : (
            <Film size={14} className="text-teal-400" />
          )}
          <span className="text-xs font-semibold text-gray-100">
            {activeCount > 0
              ? `${activeCount} download berjalan`
              : 'Download YouTube'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
          {downloads.map((dl) => {
            const { label, color } = getYTStatusDisplay(dl.status);
            const isActive = dl.status !== 'completed' && dl.status !== 'failed';
            const isDone = dl.status === 'completed';
            const isFailed = dl.status === 'failed';

            return (
              <div key={dl.downloadId} className="p-3 space-y-2">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isActive && <Loader2 size={12} className="animate-spin text-teal-400 flex-shrink-0 mt-0.5" />}
                    {isDone && <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />}
                    {isFailed && <AlertTriangle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />}
                    <span className="text-xs text-gray-300 truncate">
                      {dl.title ?? 'Video YouTube'}
                    </span>
                  </div>
                  <button
                    onClick={() => dismissDownload(dl.downloadId)}
                    className="flex-shrink-0 p-1 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all flex items-center justify-center"
                    title="Hapus / Sembunyikan"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Status */}
                <span className={`text-xs font-medium ${color}`}>{label}</span>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        isFailed ? 'bg-red-500' : isDone ? 'bg-emerald-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(dl.percent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span className="font-mono">{dl.percent.toFixed(1)}%</span>
                    <div className="flex gap-2">
                      {dl.speed && <span>{dl.speed}</span>}
                      {dl.eta && <span>ETA {dl.eta}</span>}
                    </div>
                  </div>
                </div>

                {/* Error message */}
                {isFailed && dl.error && (
                  <p className="text-[10px] text-red-400 leading-relaxed">{dl.error}</p>
                )}
                {isDone && (
                  <p className="text-[10px] text-emerald-400">
                    Video siap diklasifikasi ✓
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
