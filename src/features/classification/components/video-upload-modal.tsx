'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, Loader2, Link2, Film, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useUploadJob } from '@/features/classification/hooks/use-classification';
import { classificationRepository } from '@/features/classification/api/classification.repository';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (jobId: string) => void;
}

type UploadTab = 'file' | 'youtube';

// ── YouTube Download Progress Status ────────────────────────────────
type YTStatus =
  | 'pending'
  | 'extracting_info'
  | 'downloading'
  | 'uploading_to_storage'
  | 'creating_job'
  | 'completed'
  | 'failed';

function getYTStatusDisplay(status: YTStatus): { label: string; color: string } {
  switch (status) {
    case 'pending':
      return { label: 'Mempersiapkan...', color: 'text-gray-500' };
    case 'extracting_info':
      return { label: 'Mengambil info video...', color: 'text-blue-600' };
    case 'downloading':
      return { label: 'Mengunduh dari YouTube...', color: 'text-amber-600' };
    case 'uploading_to_storage':
      return { label: 'Menyimpan ke server...', color: 'text-indigo-600' };
    case 'creating_job':
      return { label: 'Membuat job pipeline...', color: 'text-teal-600' };
    case 'completed':
      return { label: 'Selesai!', color: 'text-emerald-600' };
    case 'failed':
      return { label: 'Gagal', color: 'text-red-600' };
    default:
      return { label: status, color: 'text-gray-500' };
  }
}

export function VideoUploadModal({ isOpen, onClose, onUploadSuccess }: VideoUploadModalProps) {
  const [activeTab, setActiveTab] = useState<UploadTab>('file');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // YouTube state
  const [ytUrl, setYtUrl] = useState('');
  const [ytDownloadId, setYtDownloadId] = useState<string | null>(null);
  const [ytProgress, setYtProgress] = useState<{
    status: YTStatus;
    title: string | null;
    percent: number;
    speed: string | null;
    eta: string | null;
    error: string | null;
    job_id: string | null;
  } | null>(null);
  const [ytSubmitting, setYtSubmitting] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { mutate: upload, isPending } = useUploadJob((data) => {
    onUploadSuccess(String(data.id));
    onClose();
    setFile(null);
    setError(null);
  });

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Poll YouTube download progress ────────────────────────────
  const startPolling = useCallback(
    (downloadId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);

      pollRef.current = setInterval(async () => {
        try {
          const data = await classificationRepository.getYoutubeDownloadProgress(downloadId);
          setYtProgress({
            status: data.status as YTStatus,
            title: data.title,
            percent: data.percent,
            speed: data.speed,
            eta: data.eta,
            error: data.error,
            job_id: data.job_id,
          });

          // Stop polling on terminal states
          if (data.status === 'completed' || data.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;

            if (data.status === 'completed' && data.job_id) {
              // Auto-close after brief delay
              setTimeout(() => {
                onUploadSuccess(data.job_id!);
                onClose();
                resetYtState();
              }, 1500);
            }
          }
        } catch {
          // Silently retry
        }
      }, 1000);
    },
    [onUploadSuccess, onClose],
  );

  const resetYtState = () => {
    setYtUrl('');
    setYtDownloadId(null);
    setYtProgress(null);
    setYtSubmitting(false);
    setError(null);
  };

  if (!isOpen) return null;

  // ── File upload handler ───────────────────────────────────────
  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('File video harus dipilih.');
      return;
    }

    setError(null);
    upload(
      { file },
      {
        onError: (err: unknown) => {
          const resp = (err as { response?: { data?: { detail?: string } } })?.response;
          setError(resp?.data?.detail || 'Terjadi kesalahan saat mengunggah.');
        },
      },
    );
  };

  // ── YouTube download handler ──────────────────────────────────
  const handleYtDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = ytUrl.trim();

    if (!trimmed) {
      setError('URL YouTube harus diisi.');
      return;
    }

    // Basic client-side validation
    if (!/youtube\.com|youtu\.be/.test(trimmed)) {
      setError('URL harus dari youtube.com atau youtu.be');
      return;
    }

    setError(null);
    setYtSubmitting(true);

    try {
      const result = await classificationRepository.startYoutubeDownload(trimmed);
      setYtDownloadId(result.download_id);
      setYtProgress({
        status: 'pending',
        title: null,
        percent: 0,
        speed: null,
        eta: null,
        error: null,
        job_id: null,
      });

      // Start polling for progress
      startPolling(result.download_id);
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response;
      setError(resp?.data?.detail || 'Gagal memulai download YouTube.');
      setYtSubmitting(false);
    }
  };

  const isDownloading = ytDownloadId && ytProgress && ytProgress.status !== 'completed' && ytProgress.status !== 'failed';
  const isCompleted = ytProgress?.status === 'completed';
  const isFailed = ytProgress?.status === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Upload size={18} className="text-teal-600" /> Upload Video Baru
          </h2>
          <button
            onClick={() => {
              if (!isPending && !isDownloading) {
                onClose();
                resetYtState();
                setFile(null);
                setError(null);
              }
            }}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
            disabled={isPending || !!isDownloading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { if (!isPending && !isDownloading) { setActiveTab('file'); setError(null); } }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'file'
                ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            disabled={isPending || !!isDownloading}
          >
            <Film size={14} /> File Lokal
          </button>
          <button
            onClick={() => { if (!isPending && !isDownloading) { setActiveTab('youtube'); setError(null); } }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'youtube'
                ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            disabled={isPending || !!isDownloading}
          >
            <Link2 size={14} /> YouTube URL
          </button>
        </div>

        {/* ── File Upload Tab ──────────────────────────────────── */}
        {activeTab === 'file' && (
          <form onSubmit={handleFileUpload} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            {/* File picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File Video</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-teal-400 transition-colors bg-gray-50">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-teal-500 px-2 py-1 border border-teal-100"
                    >
                      <span>Pilih file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept="video/mp4,video/webm,video/x-matroska,video/quicktime,video/avi"
                        className="sr-only"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        disabled={isPending}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">MP4, WebM, MKV, MOV, AVI</p>
                  {file && (
                    <p className="text-sm font-medium text-teal-700 mt-2 truncate max-w-[200px] mx-auto">
                      {file.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending || !file}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPending && <Loader2 size={16} className="animate-spin" />}
                {isPending ? 'Mengunggah...' : 'Unggah Video'}
              </button>
            </div>
          </form>
        )}

        {/* ── YouTube URL Tab ─────────────────────────────────── */}
        {activeTab === 'youtube' && (
          <div className="p-6 space-y-4">
            {error && !isDownloading && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            {/* URL Input (shown when not downloading) */}
            {!ytDownloadId && (
              <form onSubmit={handleYtDownload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL Video YouTube
                  </label>
                  <input
                    type="url"
                    value={ytUrl}
                    onChange={(e) => setYtUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors bg-gray-50 hover:bg-white"
                    disabled={ytSubmitting}
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Tempelkan link YouTube video yang ingin diunduh
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={ytSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={ytSubmitting || !ytUrl.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {ytSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {ytSubmitting ? 'Memulai...' : 'Unduh Video'}
                  </button>
                </div>
              </form>
            )}

            {/* Progress indicator (shown while downloading) */}
            {ytDownloadId && ytProgress && (
              <div className="space-y-4">
                {/* Title */}
                {ytProgress.title && (
                  <div className="flex items-start gap-2">
                    <Film size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">
                      {ytProgress.title}
                    </p>
                  </div>
                )}

                {/* Status label */}
                <div className="flex items-center gap-2">
                  {isDownloading && (
                    <Loader2 size={14} className="animate-spin text-teal-600" />
                  )}
                  {isCompleted && (
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  )}
                  {isFailed && (
                    <AlertTriangle size={14} className="text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${getYTStatusDisplay(ytProgress.status).color}`}>
                    {getYTStatusDisplay(ytProgress.status).label}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        isFailed
                          ? 'bg-red-500'
                          : isCompleted
                            ? 'bg-emerald-500'
                            : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(ytProgress.percent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="font-mono">{ytProgress.percent.toFixed(1)}%</span>
                    <div className="flex gap-3">
                      {ytProgress.speed && (
                        <span>{ytProgress.speed}</span>
                      )}
                      {ytProgress.eta && (
                        <span>ETA {ytProgress.eta}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Error message */}
                {isFailed && ytProgress.error && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                    {ytProgress.error}
                  </div>
                )}

                {/* Completed message */}
                {isCompleted && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    Video berhasil diunduh dan siap diklasifikasi!
                  </div>
                )}

                {/* Retry / Close for failed */}
                {isFailed && (
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetYtState();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Coba Lagi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        resetYtState();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Tutup
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
