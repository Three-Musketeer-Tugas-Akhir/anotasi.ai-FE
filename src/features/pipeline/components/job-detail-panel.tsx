'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '@/core/api/axios-client';
import { env } from '@/core/config/env';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Combobox } from '@/components/ui/combobox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Video,
  FileText,
  Film,
  Scissors,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowDown,
  ExternalLink,
  RotateCcw,
  Download,
  XCircle,
  ChevronDown,
  ChevronRight,
  Ban,
  Play,
  Pause,
  Eye,
  Shield,
  X,
  Volume2,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';
import { toast } from 'sonner';
import { pipelineApi } from '../pipeline-api';
import type {
  JobStatusDetailResponse,
  JobResultsResponse,
  SignLanguageCategory,
  Stage1ResultsResponse,
  Stage1SegmentResult,
  Stage2ResultsResponse,
  Stage2SegmentResult,
  Stage2Utterance,
  Stage3ResultsResponse,
  Stage3SegmentResult,
  Stage3Utterance,
} from '../types';
import { JOB_STATUS, PROCESSING_STATUSES } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── Types ──────────────────────────────────────────────────────────

type StageStatus = 'pending' | 'processing' | 'done' | 'failed' | 'cancelled';

interface StageInfo {
  name: string;
  stageNumber: 1 | 2 | 3;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  status: StageStatus;
}

interface JobDetailPanelProps {
  jobId: string;
  onJobChanged: () => void;
  listRefreshTrigger?: number;
}

// ── Helpers ────────────────────────────────────────────────────────

function mapJobToStages(job: JobStatusDetailResponse): StageInfo[] {
  const s = job.status;
  const stage = job.current_stage;

  const getStageStatus = (stageOrder: number): StageStatus => {
    if (s === JOB_STATUS.CANCELLED) return 'cancelled';

    const currentOrder =
      s === JOB_STATUS.DETECTING ? 1
      : (s === JOB_STATUS.TRANSCRIBING || s === JOB_STATUS.ASR_COMPLETED) ? 2
      : (s === JOB_STATUS.CROPPING || s === JOB_STATUS.CROPPING_IN_PROGRESS) ? 3
      : (s === JOB_STATUS.READY_FOR_ANNOTATION || s === JOB_STATUS.NEEDS_VOICE_ANNOTATION) ? 4
      : 0;

    if (s === JOB_STATUS.FAILED || s === JOB_STATUS.CROPPING_FAILED) {
      if (stage === 'detection' && stageOrder === 1) return 'failed';
      if (stage === 'asr' && stageOrder === 2) return 'failed';
      // If s === CROPPING_FAILED or stage === cropping, mark stage 3 as failed
      if ((stage === 'cropping' || s === JOB_STATUS.CROPPING_FAILED) && stageOrder === 3) return 'failed';
      
      // If the stage that failed is later than this stageOrder, mark this stage as done
      if (s === JOB_STATUS.CROPPING_FAILED && stageOrder < 3) return 'done';
      if (stage === 'asr' && stageOrder < 2) return 'done';
      if (stage === 'cropping' && stageOrder < 3) return 'done';
      
      return 'pending';
    }

    if (currentOrder > 0 && stageOrder < currentOrder) return 'done';
    if (stageOrder === currentOrder) return 'processing';
    if (currentOrder === 4) return 'done';
    return 'pending';
  };

  return [
    {
      name: 'detection',
      stageNumber: 1,
      label: 'CV-1: Deteksi & Ekstraksi Segmen',
      subtitle: 'YOLO Computer Vision memotong video menjadi segmen berisi JBI',
      icon: <Scissors size={18} />,
      status: getStageStatus(1),
    },
    {
      name: 'asr',
      stageNumber: 2,
      label: 'ASR: Transkripsi Otomatis',
      subtitle: 'Whisper Speech Recognition mengubah audio menjadi teks',
      icon: <FileText size={18} />,
      status: getStageStatus(2),
    },
    {
      name: 'cropping',
      stageNumber: 3,
      label: 'CV-2: Video Cropping',
      subtitle: 'Memotong video menjadi clip per segmen yang terdeteksi',
      icon: <Film size={18} />,
      status: getStageStatus(3),
    },
  ];
}

const stageStatusConfig: Record<StageStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Menunggu', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: <Clock size={12} /> },
  processing: { label: 'Berjalan', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Loader2 size={12} className="animate-spin" /> },
  done: { label: 'Selesai', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  failed: { label: 'Gagal', color: 'bg-red-50 text-red-700 border-red-200', icon: <AlertTriangle size={12} /> },
  cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-400 border-gray-200', icon: <Ban size={12} /> },
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function getConfidenceColor(score: number): string {
  if (score >= 0.9) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 0.7) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function getConfidenceLabel(score: number): string {
  if (score >= 0.9) return 'Tinggi';
  if (score >= 0.7) return 'Sedang';
  return 'Rendah';
}

// ── Video Preview Modal ─────────────────────────────────────────────
// Uses createPortal to render OUTSIDE the arena div so pointer-capture
// on the canvas never intercepts close/button clicks.

function VideoPreviewModal({
  open,
  onClose,
  videoUrl,
  title,
  subtitle,
}: {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  subtitle?: string;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open || !videoUrl) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      setVideoLoading(false);
      setVideoError(null);
      setBlobUrl(`/proxy-segment?url=${encodeURIComponent(videoUrl)}&token=${token}`);
    }
  }, [open, videoUrl]);

  // Pause & clear video on close so audio stops
  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    setBlobUrl(null);
    onClose();
  };

  // Keyboard: Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    // Backdrop — click outside to close
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onPointerDown={(e) => {
        // Close only if clicking directly on the backdrop, not the modal panel
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Modal panel */}
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[720px] mx-4 overflow-hidden flex flex-col"
        onPointerDown={(e) => e.stopPropagation()} // prevent backdrop handler
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <Play size={16} className="text-teal-600" />
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {/* X button — always clickable */}
          <button
            type="button"
            onClick={handleClose}
            className="ml-4 flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video area */}
        <div className="bg-black min-h-[200px] flex items-center justify-center">
          {videoLoading ? (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-xs">Memuat video...</span>
            </div>
          ) : videoError ? (
            <div className="flex flex-col items-center gap-2 text-red-400 px-6 text-center">
              <AlertTriangle size={24} />
              <span className="text-xs">{videoError}</span>
            </div>
          ) : blobUrl ? (
            <video
              ref={videoRef}
              src={blobUrl}
              controls
              autoPlay
              className="w-full max-h-[420px] object-contain"
              preload="metadata"
            >
              <track kind="captions" />
              Browser tidak mendukung video playback.
            </video>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClose}>
            <X size={14} className="mr-1" /> Tutup
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function JobDetailPanel({ jobId, onJobChanged, listRefreshTrigger }: JobDetailPanelProps) {
  const [starting, setStarting] = useState(false);
  const [downloadingDataset, setDownloadingDataset] = useState(false);
  const [job, setJob] = useState<JobStatusDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryDialogMode, setRetryDialogMode] = useState<'full' | null>(null);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    detection: false, asr: false, cropping: true,
  });

  // ── Stage Results State (cached, fetched once) ──────────────────
  const [stage1, setStage1] = useState<Stage1ResultsResponse | null>(null);
  const [stage2, setStage2] = useState<Stage2ResultsResponse | null>(null);
  const [stage3, setStage3] = useState<Stage3ResultsResponse | null>(null);
  const [stageLoading, setStageLoading] = useState<Record<number, boolean>>({});
  const [stageErrors, setStageErrors] = useState<Record<number, string>>({});

  // ── Video Preview Modal ─────────────────────────────────────────
  const [previewVideo, setPreviewVideo] = useState<{
    url: string; title: string; subtitle?: string;
  } | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // ── Arena Canvas State ──────────────────────────────────────────
  const NODE_WIDTH = 600; // px — the fixed width of the node column
  const [transform, setTransform] = useState({ x: 0, y: 50, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const arenaRef = useRef<HTMLDivElement>(null);

  const lastCenteredJobIdRef = useRef<string | null>(null);

  const centerArena = useCallback((containerWidth: number) => {
    if (containerWidth > 0) {
      setTransform({ x: (containerWidth / 2) - (NODE_WIDTH / 2), y: 40, scale: 1 });
    }
  }, []);

  // Robust centering using ResizeObserver as the single source of truth.
  // It provides guaranteed dimensions (unlike getBoundingClientRect() on mount)
  // and fires immediately when observed and whenever size changes.
  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const width = entries[0].contentRect.width;
      
      // Center if we have a valid width and haven't centered THIS job yet
      if (width > 0 && lastCenteredJobIdRef.current !== jobId) {
        centerArena(width);
        lastCenteredJobIdRef.current = jobId;
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [jobId, centerArena, loading]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.no-drag-scroll')) return;
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      let newScale = transform.scale * zoomFactor;
      newScale = Math.min(Math.max(0.3, newScale), 2.5);
      setTransform(prev => ({ ...prev, scale: newScale }));
    } else {
      setTransform(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    el.addEventListener('wheel', preventZoom, { passive: false });
    return () => el.removeEventListener('wheel', preventZoom);
  }, [loading]);

  const handleZoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.2, 2.5) }));
  const handleZoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.3) }));
  const handleReset = () => {
    if (arenaRef.current) {
      centerArena(arenaRef.current.getBoundingClientRect().width);
    }
  };

  // ── Fetch Job Detail ──────────────────────────────────────────

  const fetchJob = useCallback(async () => {
    try {
      const data = await pipelineApi.getJob(jobId);
      setJob(data);
      setError(null);
      return data;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Gagal memuat detail job';
      setError(typeof msg === 'string' ? msg : 'Gagal memuat detail job');
      return null;
    }
  }, [jobId]);

  // ── Smart Stage Results Fetching ────────────────────────────────
  // Fetch stage results ONCE when the job transitions past that stage.
  // Uses prevStatusRef to detect transitions — no redundant fetches.

  const fetchStageResults = useCallback(async (stageNum: 1 | 2 | 3) => {
    setStageLoading((prev) => ({ ...prev, [stageNum]: true }));
    setStageErrors((prev) => ({ ...prev, [stageNum]: '' }));
    try {
      if (stageNum === 1) {
        const data = await pipelineApi.getStage1Results(jobId);
        setStage1(data);
      } else if (stageNum === 2) {
        const data = await pipelineApi.getStage2Results(jobId);
        setStage2(data);
      } else {
        const data = await pipelineApi.getStage3Results(jobId);
        setStage3(data);
      }
    } catch (err: any) {
      // Stage not ready yet or error
      const msg = err?.response?.data?.detail?.error?.message || err.message || 'Unknown error';
      setStageErrors((prev) => ({ ...prev, [stageNum]: msg }));
      console.error(`Error fetching stage ${stageNum}:`, err);
    } finally {
      setStageLoading((prev) => ({ ...prev, [stageNum]: false }));
    }
  }, [jobId]);

  // When job status changes, check which stages became "done" and fetch their results
  useEffect(() => {
    if (!job) return;
    const s = job.status;
    const prev = prevStatusRef.current;

    // Determine which stages are now complete based on current status
    const stages = mapJobToStages(job);
    const stage1Done = stages.find(st => st.stageNumber === 1)?.status === 'done';
    const stage2Done = stages.find(st => st.stageNumber === 2)?.status === 'done';
    const stage3Done = stages.find(st => st.stageNumber === 3)?.status === 'done';

    // Fetch results for stages that just became done (we haven't cached yet)
    if (stage1Done && !stage1) fetchStageResults(1);
    if (stage2Done && !stage2) fetchStageResults(2);
    if (stage3Done && !stage3) fetchStageResults(3);

    prevStatusRef.current = s;
  }, [job?.status, stage1, stage2, stage3, fetchStageResults, job]);

  // ── Initial load + polling ────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    setStage1(null);
    setStage2(null);
    setStage3(null);
    prevStatusRef.current = null;

    fetchJob().finally(() => setLoading(false));

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Refetch when external list updates
  useEffect(() => {
    if (listRefreshTrigger && jobId) {
      fetchJob();
    }
  }, [listRefreshTrigger, jobId, fetchJob]);

  // Start/stop polling based on status
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (job && PROCESSING_STATUSES.has(job.status)) {
      pollRef.current = setInterval(async () => {
        const data = await fetchJob();
        if (data && !PROCESSING_STATUSES.has(data.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 3000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [job?.status, fetchJob]);

  // ── Actions ───────────────────────────────────────────────────

  const handleCancel = async () => {
    if (!job) return;
    setCancelling(true);
    try {
      await pipelineApi.cancelJob(jobId);
      await fetchJob();
      onJobChanged();
      toast.success('Job dibatalkan', {
        description: 'Pemrosesan video telah dibatalkan.',
        position: 'top-center',
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Gagal membatalkan job';
      setError(typeof msg === 'string' ? msg : 'Gagal membatalkan job');
      toast.error('Gagal membatalkan', {
        description: typeof msg === 'string' ? msg : 'Terjadi kesalahan saat membatalkan job.',
        position: 'top-center',
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleCategoryChange = async (value: string) => {
    if (!job) return;
    try {
      await pipelineApi.updateJobCategory(jobId, { category: value as SignLanguageCategory });
      await fetchJob();
      toast.success('Kategori diperbarui', {
        description: `Kategori diubah ke ${value}.`,
        position: 'top-center',
      });
    } catch {
      toast.error('Gagal memperbarui kategori', {
        description: 'Terjadi kesalahan saat mengubah kategori.',
        position: 'top-center',
      });
    }
  };

  const handleRetry = async (mode: 'full' | 'from_failed_stage') => {
    if (!job) return;
    setRetrying(true);
    setRetryDialogMode(null);
    try {
      await pipelineApi.retryJob(jobId, mode);
      await fetchJob();
      onJobChanged();
      toast.success('Retry dimulai', {
        description: mode === 'full' ? 'Memulai ulang seluruh pipeline.' : 'Melanjutkan pipeline dari stage yang gagal.',
        position: 'top-center',
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Gagal melakukan retry';
      toast.error('Gagal Retry', {
        description: typeof msg === 'string' ? msg : 'Terjadi kesalahan saat memulai retry.',
        position: 'top-center',
      });
    } finally {
      setRetrying(false);
    }
  };

  const toggleStage = (name: string) => {
    setExpandedStages((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const getFailedStageName = () => {
    if (!job) return 'Unknown';
    if (job.status === JOB_STATUS.CROPPING_FAILED) return 'CV-2 (Video Cropping)';
    if (job.current_stage === 'upload' || job.current_stage === 'detection') return 'CV-1 (Deteksi & Ekstraksi)';
    if (job.current_stage === 'asr') return 'ASR (Transkripsi)';
    if (job.current_stage === 'cropping') return 'CV-2 (Video Cropping)';
    return job.current_stage || 'Unknown';
  };

  // ── Loading / Error / Empty ──────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={32} className="text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => { setLoading(true); fetchJob().finally(() => setLoading(false)); }}>
            <RotateCcw size={14} className="mr-1" /> Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const stages = mapJobToStages(job);
  const isProcessing = PROCESSING_STATUSES.has(job.status);
  const isCancelled = job.status === JOB_STATUS.CANCELLED;
  const isFailed = job.status === JOB_STATUS.FAILED || job.status === JOB_STATUS.CROPPING_FAILED;
  const isCompleted = job.status === JOB_STATUS.READY_FOR_ANNOTATION;

  return (
    <div
      ref={arenaRef}
      className={`w-full h-full relative overflow-hidden bg-[#f1f5f9] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Figma-style Dot Grid Background */}
      <div
        className="absolute inset-[-10000px] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: `${24 * transform.scale}px ${24 * transform.scale}px`,
          backgroundPosition: `${transform.x}px ${transform.y}px`,
          opacity: 0.6
        }}
      />

      {/* Transform Container for Nodes */}
      <div
        className="absolute inset-0 origin-top-left flex flex-col items-start pointer-events-none"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
      >
        <div className="w-[600px] flex flex-col items-center pb-32 pointer-events-auto">
          {/* ROOT NODE: Source Video Header */}
          <div className="no-drag w-full" onPointerDown={e => e.stopPropagation()}>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 relative overflow-hidden mb-2">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Video size={80} />
        </div>

        <div className="flex items-center justify-between relative z-10 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-md shadow-slate-900/20">
              <Video size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Badge className="text-[9px] bg-slate-100 text-slate-500 px-1.5 uppercase tracking-widest font-bold border-none hover:bg-slate-100">Sumber Video</Badge>
                <span className="text-[10px] font-mono text-slate-400">#{job.id.slice(0, 8)}</span>
              </div>
              <p className="text-sm font-bold text-slate-800 leading-snug truncate max-w-[320px]" title={job.original_filename || undefined}>{job.original_filename}</p>
              <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock size={10} /> {formatDate(job.created_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 z-20">
            <Combobox
              options={[
                { value: "SIBI", label: "SIBI" },
                { value: "BISINDO", label: "BISINDO" }
              ]}
              value={job.category || ''}
              onChange={(value) => handleCategoryChange(value)}
              placeholder="Kategori..."
              className="w-[130px] h-8 text-xs bg-white"
            />

            {job.status === JOB_STATUS.UPLOADED && (
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white h-8"
                onClick={async () => {
                  if (!job.category) {
                    toast.error('Kategori belum dipilih', {
                      description: 'Pilih kategori (SIBI / BISINDO) terlebih dahulu.',
                      position: 'top-center',
                    });
                    return;
                  }
                  setStarting(true);
                  try {
                    await pipelineApi.startProcessing(jobId);
                    // Refresh both the detail panel AND the parent list
                    await fetchJob();
                    onJobChanged();
                    toast.success('Pemrosesan dimulai', {
                      description: 'Pipeline telah dimulai untuk video ini.',
                      position: 'top-center',
                    });
                  } catch (e) {
                    console.error(e);
                    toast.error('Gagal memulai', {
                      description: 'Gagal memulai proses. Pastikan kategori sudah dipilih.',
                      position: 'top-center',
                    });
                  } finally {
                    setStarting(false);
                  }
                }}
                disabled={!job.category || starting}
              >
                {starting ? (
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                ) : (
                  <Play size={14} className="mr-1.5" />
                )}
                {starting ? 'Memulai...' : 'Mulai Proses'}
              </Button>
            )}

            {isProcessing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 h-8"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    {cancelling ? <Loader2 size={14} className="animate-spin mr-1" /> : <XCircle size={14} className="mr-1" />}
                    Batalkan
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Batalkan job ini</p></TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="mt-3 flex items-center gap-3">
            <Progress value={job.progress} className="flex-1 h-2" />
            <span className="text-xs font-mono text-gray-500 w-10 text-right">{job.progress}%</span>
          </div>
        )}

        {isFailed && job.error_message && (
          <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-3">
            <div className="flex items-start gap-2 text-sm text-red-700">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <strong className="block mb-0.5">Pipeline gagal pada tahap: {getFailedStageName()}</strong>
                <span>{job.error_message}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-1">
              <Button 
                size="sm" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleRetry('from_failed_stage')}
                disabled={retrying || !job.current_stage}
              >
                {retrying ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <RotateCcw size={14} className="mr-1.5" />}
                Ulangi dari {getFailedStageName()}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => setRetryDialogMode('full')}
                disabled={retrying}
              >
                <AlertTriangle size={14} className="mr-1.5" />
                Ulangi Seluruhnya
              </Button>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 flex items-center gap-2">
            <Ban size={16} className="flex-shrink-0" />
            <span>Job ini telah dibatalkan.</span>
          </div>
        )}

        {(job.total_segments > 0 || job.completed_segments > 0) && (
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span>Total Segmen: <strong className="text-gray-700">{job.total_segments}</strong></span>
            <span>Selesai: <strong className="text-emerald-600">{job.completed_segments}</strong></span>
          </div>
        )}
      </div>
      </div>

      {/* ── Pipeline Stages ── */}
      {stages.map((stage, idx) => (
        <div key={stage.name} className="w-full">
          <StageConnector status={stage.status} isProcessing={isProcessing} />
          <div className="no-drag w-full" onPointerDown={e => e.stopPropagation()}>
            <StageSection
              stage={stage}
              expanded={!!expandedStages[stage.name]}
              onToggle={() => toggleStage(stage.name)}
              jobId={jobId}
              stage1={stage1}
              stage2={stage2}
              stage3={stage3}
              stageLoading={!!stageLoading[stage.stageNumber]}
              stageErrors={stageErrors}
              onPreviewVideo={(url, title, subtitle) =>
                setPreviewVideo({ url, title, subtitle })
              }
            />
          </div>
        </div>
      ))}

      {/* ── Completion Section ── */}
      {isCompleted && (
        <div className="w-full">
          <StageConnector status="done" isProcessing={false} />
          <div className="no-drag w-full" onPointerDown={e => e.stopPropagation()}>
            <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.2)] p-6 relative">
            <div className="text-center">
              <CheckCircle2 size={32} className="text-emerald-600 mx-auto mb-2" />
              <p className="text-base font-bold text-emerald-800">Pipeline Selesai!</p>
              <p className="text-sm text-emerald-600 mt-1">
                Semua tahap pemrosesan selesai. {job.total_segments} segmen terdeteksi.
              </p>
            </div>
            <div className="flex justify-center mt-4 gap-2 flex-wrap">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                <a href={`/asr-review?job_id=${jobId}`}>
                  <ExternalLink size={14} className="mr-1.5" /> Buka Anotasi Suara
                </a>
              </Button>
              {(job.curation_status === 'READY_TO_BE_NORMALIZED' || job.curation_status === 'NORMALIZED' || job.curation_status === 'READY_TO_EXPORT') && (
                <Button
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  disabled={downloadingDataset}
                  onClick={async () => {
                    setDownloadingDataset(true);
                    try {
                      const { apiClient } = await import('@/core/api/axios-client');
                      const response = await apiClient.get(
                        `/pipeline/jobs/${jobId}/dataset/download`,
                        { responseType: 'blob' },
                      );
                      const url = window.URL.createObjectURL(new Blob([response.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      const disposition = response.headers['content-disposition'] || '';
                      const match = disposition.match(/filename[^;=\n]*=([^;\n]*)/);
                      link.download = match ? match[1].replace(/["\']/g, '') : `dataset-${jobId}.zip`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(url);
                      toast.success('Dataset berhasil diunduh', {
                        description: 'File ZIP telah diunduh ke perangkat Anda.',
                        position: 'top-center',
                      });
                    } catch (e) {
                      console.error(e);
                      toast.error('Gagal mengunduh', {
                        description: 'Terjadi kesalahan saat mengunduh dataset.',
                        position: 'top-center',
                      });
                    } finally {
                      setDownloadingDataset(false);
                    }
                  }}
                >
                  {downloadingDataset ? (
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                  ) : (
                    <Download size={14} className="mr-1.5" />
                  )}
                  {downloadingDataset ? 'Mengunduh...' : 'Download Dataset'}
                </Button>
              )}
            </div>
          </div>
          </div>
        </div>
      )}
      </div>
      </div>

      {/* ── Floating Zoom Toolbar ── */}
      <div className="no-drag absolute bottom-6 right-6 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200 flex items-center p-1.5 z-50" onPointerDown={e => e.stopPropagation()}>
        <button onClick={handleZoomOut} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title="Zoom Out">
          <ZoomOut size={18} />
        </button>
        <span className="text-xs font-bold text-slate-600 px-3 min-w-[60px] text-center select-none font-mono">
          {Math.round(transform.scale * 100)}%
        </span>
        <button onClick={handleZoomIn} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title="Zoom In">
          <ZoomIn size={18} />
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button onClick={handleReset} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title="Fit to Screen / Recenter">
          <Maximize size={18} />
        </button>
      </div>

      {/* ── Video Preview Modal ── */}
      {previewVideo && (
        <VideoPreviewModal
        open={!!previewVideo}
        onClose={() => setPreviewVideo(null)}
        videoUrl={previewVideo?.url || ''}
        title={previewVideo?.title || ''}
        subtitle={previewVideo?.subtitle}
      />
      )}

      {/* ── Retry Confirmation Dialog ── */}
      <Dialog open={!!retryDialogMode} onOpenChange={(open) => !open && setRetryDialogMode(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={18} /> Ulangi Seluruh Pipeline?
            </DialogTitle>
            <DialogDescription className="pt-2 text-gray-600">
              <p className="mb-2">Semua data hasil pemrosesan akan dihapus secara permanen:</p>
              <ul className="list-disc list-inside mb-4 text-sm space-y-1">
                <li>Segmen video yang terdeteksi</li>
                <li>Hasil transkripsi (ASR)</li>
                <li>Video yang sudah dipotong</li>
                <li>Anotasi dan review yang terkait</li>
              </ul>
              <p className="text-sm font-medium">Proses akan dimulai ulang dari awal (Deteksi).</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setRetryDialogMode(null)} disabled={retrying}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleRetry('full')}
              disabled={retrying}
            >
              {retrying ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
              Ya, Ulangi Seluruhnya
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-Components ──────────────────────────────────────────────────

function StageConnector({ status, isProcessing }: { status: string; isProcessing: boolean }) {
  if (status === 'done') {
      return (
          <div className="flex flex-col items-center h-10 my-1 justify-center relative">
              <div className="w-1 h-full bg-emerald-400" />
              <ChevronDown size={14} className="text-emerald-400 absolute -bottom-2 bg-[#f1f5f9]" />
          </div>
      );
  }

  if (status === 'processing' || isProcessing) {
      return (
          <div className="flex flex-col items-center h-10 my-1 justify-center relative w-full overflow-hidden">
              <svg height="100%" width="4" className="absolute">
                  <line x1="2" y1="0" x2="2" y2="40" stroke="#fbbf24" strokeWidth="4" strokeDasharray="8 8" className="animate-flow" />
              </svg>
              <ChevronDown size={14} className="text-amber-400 absolute -bottom-2 bg-[#f1f5f9]" />
          </div>
      );
  }

  return (
      <div className="flex flex-col items-center h-10 my-1 justify-center relative">
          <div className="w-1 h-full bg-slate-300 border-dashed" style={{ borderLeft: '3px dashed #cbd5e1', background: 'transparent', width: '3px' }} />
          <ChevronDown size={14} className="text-slate-300 absolute -bottom-2 bg-[#f1f5f9]" />
      </div>
  );
}

function StageSection({
  stage,
  expanded,
  onToggle,
  jobId,
  stage1,
  stage2,
  stage3,
  stageLoading,
  stageErrors,
  onPreviewVideo,
}: {
  stage: StageInfo;
  expanded: boolean;
  onToggle: () => void;
  jobId: string;
  stage1: Stage1ResultsResponse | null;
  stage2: Stage2ResultsResponse | null;
  stage3: Stage3ResultsResponse | null;
  stageLoading: boolean;
  stageErrors: Record<number, string>;
  onPreviewVideo: (url: string, title: string, subtitle?: string) => void;
}) {
  const styles = {
    done: { bg: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-200 shadow-sm', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Selesai' },
    processing: { bg: 'bg-amber-100 text-amber-600', border: 'border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.15)] ring-2 ring-amber-100 ring-offset-2', badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Berjalan' },
    pending: { bg: 'bg-slate-50 text-slate-400', border: 'border-slate-200 border-dashed opacity-80', badge: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Menunggu' },
    failed: { bg: 'bg-red-100 text-red-600', border: 'border-red-200 shadow-sm', badge: 'bg-red-50 text-red-700 border-red-200', label: 'Gagal' },
    cancelled: { bg: 'bg-gray-100 text-gray-500', border: 'border-gray-200 border-dashed', badge: 'bg-gray-50 text-gray-600 border-gray-200', label: 'Dibatalkan' },
  }[stage.status] || { bg: 'bg-slate-100 text-slate-400', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-500', label: 'Menunggu' };

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all relative overflow-hidden group ${styles.border}`}>
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center gap-4 text-left hover:bg-slate-50/50 transition-colors focus:outline-none"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.bg}`}>
          {stage.status === 'processing' ? <Loader2 size={24} className="animate-spin" /> : stage.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className={`text-[15px] font-bold ${stage.status === 'pending' ? 'text-slate-500' : 'text-slate-800'}`}>{stage.label}</h3>
            <Badge variant="outline" className={`text-[10px] py-0.5 px-2 border ${styles.badge}`}>
              {stage.status === 'done' && <CheckCircle2 size={10} className="mr-1 inline-block" />}
              {styles.label}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">{stage.subtitle}</p>
        </div>
        <div className="text-slate-400 p-2 bg-slate-50 rounded-full group-hover:bg-slate-100 transition-colors flex-shrink-0">
          <ChevronDown size={18} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-100/50 bg-slate-50/30">
          {stage.status === 'pending' && (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
              <Clock size={20} className="mb-2 opacity-50" />
              <span className="text-sm font-medium">Menunggu tahap sebelumnya selesai...</span>
            </div>
          )}
          {stage.status === 'processing' && (
            <div className="flex flex-col items-center justify-center py-6 text-amber-600">
              <Loader2 size={24} className="mb-2 animate-spin" />
              <span className="text-sm font-medium">Sedang memproses...</span>
            </div>
          )}
          {stage.status === 'failed' && (
            <div className="flex flex-col items-center justify-center py-6 text-red-600">
              <AlertTriangle size={20} className="mb-2" />
              <span className="text-sm font-medium">Tahap ini gagal</span>
            </div>
          )}
          {stage.status === 'cancelled' && (
            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
              <Ban size={20} className="mb-2" />
              <span className="text-sm font-medium">Dibatalkan</span>
            </div>
          )}

          {/* ── Stage Results (when done) ── */}
          {stage.status === 'done' && stageLoading && (
            <div className="flex flex-col items-center justify-center py-6 text-teal-600">
              <Loader2 size={20} className="mb-2 animate-spin" />
              <span className="text-sm font-medium">Memuat hasil...</span>
            </div>
          )}

          {stage.status === 'done' && !stageLoading && stage.stageNumber === 1 && (
            <Stage1Content results={stage1} error={stageErrors[1]} onPreviewVideo={onPreviewVideo} />
          )}

          {stage.status === 'done' && !stageLoading && stage.stageNumber === 2 && (
            <Stage2Content results={stage2} error={stageErrors[2]} jobId={jobId} />
          )}

          {stage.status === 'done' && !stageLoading && stage.stageNumber === 3 && (
            <Stage3Content results={stage3} onPreviewVideo={onPreviewVideo} jobId={jobId} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Stage 1 Results: Detection Segments ─────────────────────────────

function Stage1Content({
  results,
  error,
  onPreviewVideo,
}: {
  results: Stage1ResultsResponse | null;
  error?: string;
  onPreviewVideo: (url: string, title: string, subtitle?: string) => void;
}) {
  if (error) {
    return (
      <div className="flex items-center justify-center py-4 text-red-600">
        <AlertTriangle size={16} className="mr-2" />
        <span className="text-sm">Gagal memuat hasil: {error}</span>
      </div>
    );
  }

  if (!results || results.results.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-emerald-600">
        <CheckCircle2 size={16} className="mr-2" />
        <span className="text-sm">Tahap selesai — belum ada segmen terdeteksi</span>
      </div>
    );
  }

  const segments = results.results;

  const renderCard = (seg: any, wClass: string = "w-full") => (
    <button
      key={seg.id}
      onClick={() =>
        onPreviewVideo(
          seg.url,
          `Segmen #${seg.segment_index + 1}`,
          seg.bbox_data && seg.bbox_data.x_min != null
            ? `BBox: ${seg.bbox_data.x_min.toFixed(0)}, ${seg.bbox_data.y_min.toFixed(0)} — ${seg.bbox_data.width.toFixed(0)}×${seg.bbox_data.height.toFixed(0)}`
            : undefined
        )
      }
      className={`${wClass} bg-gray-50 rounded-xl border border-gray-200 p-3 flex items-center gap-3 hover:border-teal-300 hover:bg-teal-50/50 transition-all text-left group flex-shrink-0 shadow-sm`}
    >
      <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-200 transition-colors">
        <Play size={16} className="text-teal-600 ml-0.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-800">
          Segmen #{seg.segment_index + 1}
        </p>
        <p className="text-[10px] text-gray-400 font-mono mt-0.5">
          ID: {seg.id.slice(0, 8)}...
        </p>
      </div>
      <Eye size={16} className="text-gray-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
    </button>
  );

  return (
    <div className="pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600 border-gray-200">
          <Layers size={10} className="mr-1.5" />
          {segments.length} Segmen Terdeteksi
        </Badge>
      </div>

      <div className="max-h-[240px] overflow-y-auto pr-1 pb-1 no-drag-scroll">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {segments.map((seg) => renderCard(seg))}
        </div>
      </div>
    </div>
  );
}

// ── Stage 2 Results: ASR Segment Cards (Collapsible) ────────────────

function Stage2Content({
  results,
  error,
  jobId,
}: {
  results: Stage2ResultsResponse | null;
  error?: string;
  jobId: string;
}) {
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({});
  const PREVIEW_LIMIT = 5;

  if (error) {
    return (
      <div className="flex items-center justify-center py-4 text-red-600">
        <AlertTriangle size={16} className="mr-2" />
        <span className="text-sm">Gagal memuat hasil: {error}</span>
      </div>
    );
  }

  if (!results || results.results.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-emerald-600">
        <CheckCircle2 size={16} className="mr-2" />
        <span className="text-sm">Tahap selesai — belum ada transkrip</span>
      </div>
    );
  }

  const totalUtterances = results.results.reduce((sum, s) => sum + s.utterances.length, 0);
  const allUtterances = results.results.flatMap((s) => s.utterances);
  const avgConf = allUtterances.length > 0
    ? allUtterances.reduce((sum, u) => sum + u.confidence, 0) / allUtterances.length
    : 0;

  const toggleSegment = (segId: string) => {
    setExpandedSegments((prev) => ({ ...prev, [segId]: !prev[segId] }));
  };

  return (
    <div className="pt-3 space-y-3">
      {/* Summary Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600 border-gray-200">
          <FileText size={9} className="mr-1" />
          {results.results.length} Segmen • {totalUtterances} Kalimat
        </Badge>
        <Badge variant="outline" className={`text-[10px] ${getConfidenceColor(avgConf)}`}>
          <Shield size={9} className="mr-1" />
          Avg Confidence: {(avgConf * 100).toFixed(0)}%
        </Badge>
      </div>

      {/* Segment Cards */}
      {results.results.map((segment, segIdx) => {
        const isExpanded = !!expandedSegments[segment.segment_id];
        const uttCount = segment.utterances.length;
        const previewUtts = segment.utterances.slice(0, PREVIEW_LIMIT);
        const hasMore = uttCount > PREVIEW_LIMIT;

        return (
          <div key={segment.segment_id} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
            {/* Segment Card Header */}
            <button
              onClick={() => toggleSegment(segment.segment_id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Volume2 size={14} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800">Segmen #{segIdx + 1}</p>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200">
                    {uttCount} kalimat
                  </Badge>
                  {segment.asr_review_flag && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200">
                      <AlertTriangle size={8} className="mr-0.5" /> Perlu Review
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                  ID: {segment.segment_id.slice(0, 12)}...
                </p>
              </div>
              <div className="text-gray-400 flex-shrink-0">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </button>

            {/* Expanded: Preview Utterances */}
            {isExpanded && (
              <div className="px-4 pb-3 border-t border-gray-200 space-y-1.5 pt-2">
                {previewUtts.map((utt) => {
                  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                  const proxiedAudioUrl = utt.audio_url && token
                    ? `/proxy-segment?url=${encodeURIComponent(utt.audio_url)}&token=${token}#t=${utt.start},${utt.end}`
                    : null;

                  return (
                  <div key={utt.id} className="bg-white rounded-lg border border-gray-100 p-2.5">
                    <p className="text-sm text-gray-800 leading-relaxed line-clamp-1">
                      &ldquo;{utt.text}&rdquo;
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-gray-400">
                        {formatTime(utt.start)} → {formatTime(utt.end)}
                      </span>
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getConfidenceColor(utt.confidence)}`}>
                        {(utt.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    {proxiedAudioUrl && (
                      <audio src={proxiedAudioUrl} controls className="w-full h-7 mt-1.5" />
                    )}
                  </div>
                  );
                })}

                {/* "Lihat Selengkapnya" */}
                <div className="flex justify-center pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50 w-full"
                    asChild
                  >
                    <a href={`/asr-review?job_id=${jobId}`}>
                      <ExternalLink size={12} className="mr-1" />
                      {hasMore ? `Lihat Selengkapnya (${uttCount - PREVIEW_LIMIT} kalimat lagi)` : 'Buka di ASR Review'}
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Stage 3 Results: Cropped Utterances ──────────────────────────────

function Stage3Content({
  results,
  onPreviewVideo,
  jobId,
}: {
  results: Stage3ResultsResponse | null;
  onPreviewVideo: (url: string, title: string, subtitle?: string) => void;
  jobId: string;
}) {
  if (!results || results.results.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-emerald-600">
        <CheckCircle2 size={16} className="mr-2" />
        <span className="text-sm">Tahap selesai — belum ada video crop</span>
      </div>
    );
  }

  const { summary } = results;
  const allUtterances = results.results.flatMap((seg) => seg.utterances);

  return (
    <div className="pt-3 space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-2.5 text-center">
          <p className="text-lg font-bold text-gray-800">{summary.total_utterances}</p>
          <p className="text-[9px] text-gray-400 uppercase tracking-wider">Total</p>
        </div>
        <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-2.5 text-center">
          <p className="text-lg font-bold text-emerald-700">{summary.cropped}</p>
          <p className="text-[9px] text-emerald-500 uppercase tracking-wider">Cropped</p>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-2.5 text-center">
          <p className="text-lg font-bold text-red-600">{summary.failed}</p>
          <p className="text-[9px] text-red-400 uppercase tracking-wider">Gagal</p>
        </div>
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-2.5 text-center">
          <p className="text-lg font-bold text-amber-600">{summary.pending}</p>
          <p className="text-[9px] text-amber-400 uppercase tracking-wider">Pending</p>
        </div>
      </div>

      {/* Utterances Grid */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Film size={14} className="text-indigo-500" />
          Daftar Video Cropping
        </h4>
        <div className="max-h-[400px] overflow-y-auto pr-1 pb-1 no-drag-scroll">
          <div className="flex flex-col gap-2">
            {allUtterances.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Tidak ada data crop.</p>
            ) : (
              allUtterances.map((utt) => {
                const isCropped = utt.status === 'cropped';
                const isFailed = utt.status === 'failed';

                return (
                  <button
                    key={utt.id}
                    onClick={() => {
                      if (utt.url && isCropped) {
                        onPreviewVideo(
                          utt.url,
                          `Cropped #${utt.utterance_index + 1}`,
                          `"${utt.text}" — ${formatTime(utt.start)} → ${formatTime(utt.end)}`
                        );
                      }
                    }}
                    disabled={!utt.url || !isCropped}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      isCropped && utt.url
                        ? 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 group cursor-pointer shadow-sm'
                        : isFailed
                          ? 'bg-red-50/50 border-red-100 cursor-default'
                          : 'bg-white border-gray-100 opacity-60 cursor-default'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isCropped ? 'bg-indigo-100' :
                        isFailed ? 'bg-red-100' :
                        'bg-gray-100'
                      }`}>
                        {isCropped ? <Film size={12} className="text-indigo-600" /> :
                        isFailed ? <AlertTriangle size={12} className="text-red-500" /> :
                        <Clock size={12} className="text-gray-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-800 leading-relaxed line-clamp-1 flex-1">
                            &ldquo;{utt.text}&rdquo;
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 flex-shrink-0 ${
                            isCropped ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            isFailed ? 'bg-red-50 text-red-600 border-red-200' :
                            'bg-gray-50 text-gray-500 border-gray-200'
                          }`}>
                            {isCropped ? 'Cropped' : isFailed ? 'Gagal' : 'Pending'}
                          </Badge>
                          <span className="text-[10px] font-mono text-gray-400">
                            {formatTime(utt.start)} → {formatTime(utt.end)}
                          </span>
                        </div>
                      </div>
                      {isCropped && utt.url && (
                        <Eye size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Link to Voice Annotation page */}
      <div className="flex justify-center pt-2">
        <Button variant="outline" size="sm" className="text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50" asChild>
          <a href={`/asr-review?job_id=${jobId}`}>
            <ExternalLink size={12} className="mr-1" /> Buka Anotasi Suara
          </a>
        </Button>
      </div>
    </div>
  );
}
