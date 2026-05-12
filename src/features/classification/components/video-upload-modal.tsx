'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, Link2, Film } from 'lucide-react';
import { toast } from 'sonner';
import { useUploadJob } from '@/features/classification/hooks/use-classification';
import { classificationRepository } from '@/features/classification/api/classification.repository';
import type { YTDownloadState } from './youtube-download-banner';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (jobId: string) => void;
  /** Called when a YouTube download is started in background */
  onYtDownloadStarted: (state: YTDownloadState) => void;
  /** Called on every poll tick so parent can update the download state */
  onYtProgressUpdate: (downloadId: string, update: Partial<YTDownloadState>) => void;
  /** Currently selected dataset ID to associate with the upload */
  datasetId?: string;
}

type UploadTab = 'file' | 'youtube';

export function VideoUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  onYtDownloadStarted,
  onYtProgressUpdate,
  datasetId,
}: VideoUploadModalProps) {
  const [activeTab, setActiveTab] = useState<UploadTab>('file');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ytUrl, setYtUrl] = useState('');
  const [ytSubmitting, setYtSubmitting] = useState(false);

  // Track intervals per download so multiple can co-exist
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const { mutate: upload, isPending } = useUploadJob((data) => {
    onUploadSuccess(String(data.id));
    onClose();
    setFile(null);
    setError(null);
    toast.success('Video berhasil diupload', {
      description: 'Video telah ditambahkan ke daftar klasifikasi.',
      position: 'top-center',
    });
  });

  if (!isOpen) return null;

  // ── File upload ───────────────────────────────────────────────────────
  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('File video harus dipilih.'); return; }
    setError(null);
    upload({ file, datasetId }, {
      onError: (err: unknown) => {
        const resp = (err as { response?: { data?: { detail?: string } } })?.response;
        setError(resp?.data?.detail || 'Terjadi kesalahan saat mengunggah.');
      },
    });
  };

  // ── YouTube download ──────────────────────────────────────────────────
  const handleYtDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = ytUrl.trim();
    if (!trimmed) { setError('URL YouTube harus diisi.'); return; }
    if (!/youtube\.com|youtu\.be/.test(trimmed)) {
      setError('URL harus dari youtube.com atau youtu.be');
      return;
    }

    setError(null);
    setYtSubmitting(true);

    try {
      const result = await classificationRepository.startYoutubeDownload(trimmed, undefined, datasetId);
      const downloadId = result.download_id;

      // Initial state pushed up to parent
      const initialState: YTDownloadState = {
        downloadId,
        status: 'pending',
        title: null,
        percent: 0,
        speed: null,
        eta: null,
        error: null,
        job_id: null,
      };
      onYtDownloadStarted(initialState);

      // Close modal immediately — download runs in background
      onClose();
      setYtUrl('');
      setYtSubmitting(false);

      // Start polling — managed here so we can clear on terminal state
      pollRefs.current[downloadId] = setInterval(async () => {
        try {
          const data = await classificationRepository.getYoutubeDownloadProgress(downloadId);
          onYtProgressUpdate(downloadId, {
            status: data.status as YTDownloadState['status'],
            title: data.title,
            percent: data.percent,
            speed: data.speed,
            eta: data.eta,
            error: data.error,
            job_id: data.job_id,
          });

          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(pollRefs.current[downloadId]);
            delete pollRefs.current[downloadId];

            if (data.status === 'completed' && data.job_id) {
              onUploadSuccess(data.job_id);
              toast.success('Download YouTube selesai', {
                description: 'Video siap untuk diklasifikasikan.',
                position: 'top-center',
              });
            }
          }
        } catch {
          // silently retry
        }
      }, 1500);
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response;
      setError(resp?.data?.detail || 'Gagal memulai download YouTube.');
      setYtSubmitting(false);
      toast.error('Download YouTube gagal', {
        description: resp?.data?.detail || 'Terjadi kesalahan saat memulai download.',
        position: 'top-center',
      });
    }
  };

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
              if (!isPending) {
                onClose();
                setFile(null);
                setError(null);
              }
            }}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
            disabled={isPending}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { if (!isPending) { setActiveTab('file'); setError(null); } }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'file'
                ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            disabled={isPending}
          >
            <Film size={14} /> File Lokal
          </button>
          <button
            onClick={() => { if (!isPending) { setActiveTab('youtube'); setError(null); } }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'youtube'
                ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            disabled={isPending}
          >
            <Link2 size={14} /> YouTube URL
          </button>
        </div>

        {/* ── File Upload Tab ───────────────────────────────────────── */}
        {activeTab === 'file' && (
          <form onSubmit={handleFileUpload} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending || !file}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPending && <Loader2 size={16} className="animate-spin" />}
                {isPending ? 'Mengunggah...' : 'Unggah Video'}
              </button>
            </div>
          </form>
        )}

        {/* ── YouTube URL Tab ───────────────────────────────────────── */}
        {activeTab === 'youtube' && (
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

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
                  Download akan berjalan di background — Anda bisa menutup jendela ini kapan saja.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
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
          </div>
        )}
      </div>
    </div>
  );
}
