'use client';

import { Upload, CheckCircle2, XCircle, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useFileUploads } from '@/features/classification/context/file-upload-context';

export function FileUploadBanner() {
  const { uploads, cancelUpload, dismissUpload } = useFileUploads();
  const [collapsed, setCollapsed] = useState(false);

  if (uploads.length === 0) return null;

  const activeCount = uploads.filter(
    (u) => u.status === 'pending' || u.status === 'uploading',
  ).length;

  return (
    <div className="w-80 shadow-2xl rounded-xl overflow-hidden border border-white/10 bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-white/10">
        <div className="flex items-center gap-2">
          {activeCount > 0 ? (
            <Loader2 size={14} className="animate-spin text-teal-400" />
          ) : (
            <Upload size={14} className="text-teal-400" />
          )}
          <span className="text-xs font-semibold text-gray-100">
            {activeCount > 0
              ? `${activeCount} upload berjalan`
              : 'Upload Video'}
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
          {uploads.map((upload) => {
            const isUploading = upload.status === 'pending' || upload.status === 'uploading';
            const isDone = upload.status === 'completed';
            const isFailed = upload.status === 'failed';
            const isCancelled = upload.status === 'cancelled';

            return (
              <div key={upload.uploadId} className="p-3 space-y-2">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isUploading && <Loader2 size={12} className="animate-spin text-teal-400 flex-shrink-0 mt-0.5" />}
                    {isDone && <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />}
                    {isFailed && <XCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />}
                    {isCancelled && <XCircle size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />}
                    <span className="text-xs text-gray-300 truncate">
                      {upload.fileName}
                    </span>
                  </div>
                  {(isDone || isFailed || isCancelled) && (
                    <button
                      onClick={() => dismissUpload(upload.uploadId)}
                      className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Status label */}
                <span className={`text-xs font-medium ${
                  isUploading ? 'text-teal-400' :
                  isDone ? 'text-emerald-400' :
                  isFailed ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {isUploading ? 'Mengunggah...' :
                   isDone ? 'Selesai' :
                   isFailed ? 'Gagal' :
                   isCancelled ? 'Dibatalkan' :
                   upload.status}
                </span>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        isFailed ? 'bg-red-500' : isDone ? 'bg-emerald-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(upload.progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span className="font-mono">{upload.progress.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Cancel button */}
                {isUploading && (
                  <button
                    onClick={() => cancelUpload(upload.uploadId)}
                    className="w-full text-[10px] py-1 px-2 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/10"
                  >
                    Batalkan Upload
                  </button>
                )}

                {/* Error message */}
                {isFailed && upload.error && (
                  <p className="text-[10px] text-red-400 leading-relaxed">{upload.error}</p>
                )}
                {isDone && upload.jobId && (
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
