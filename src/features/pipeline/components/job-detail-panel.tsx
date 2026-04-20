'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/core/api/axios-client';
import { env } from '@/core/config/env';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SelectValue, // Still keeping it just in case, or removing if not needed. But we'll remove it since we only use Combobox here. Wait, actually I will remove the Select block entirely and insert Combobox.
} from '@/components/ui/select';
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
} from 'lucide-react';
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
}

// ── Helpers ────────────────────────────────────────────────────────

function mapJobToStages(job: JobStatusDetailResponse): StageInfo[] {
  const s = job.status;
  const stage = job.current_stage;

  const getStageStatus = (stageOrder: number): StageStatus => {
    if (s === JOB_STATUS.CANCELLED) return 'cancelled';

    const currentOrder =
      s === JOB_STATUS.DETECTING ? 1
      : s === JOB_STATUS.TRANSCRIBING ? 2
      : s === JOB_STATUS.CROPPING ? 3
      : s === JOB_STATUS.READY_FOR_ANNOTATION ? 4
      : 0;

    if (s === JOB_STATUS.FAILED) {
      if (stage === 'detection' && stageOrder === 1) return 'failed';
      if (stage === 'asr' && stageOrder === 2) return 'failed';
      if (stage === 'cropping' && stageOrder === 3) return 'failed';
      if (stageOrder < currentOrder || (stage === 'detection' && stageOrder < 1) ||
          (stage === 'asr' && stageOrder < 2) ||
          (stage === 'cropping' && stageOrder < 3)) return 'done';
      return 'pending';
    }

    if (stageOrder < currentOrder) return 'done';
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

  useEffect(() => {
    if (!open || !videoUrl) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      setVideoLoading(false);
      setVideoError(null);
      const urlWithToken = `/proxy-segment?url=${encodeURIComponent(videoUrl)}&token=${token}`;
      setBlobUrl(urlWithToken);
    }
  }, [open, videoUrl]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Play size={16} className="text-teal-600" />
            {title}
          </DialogTitle>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </DialogHeader>
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
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X size={14} className="mr-1" /> Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function JobDetailPanel({ jobId, onJobChanged }: JobDetailPanelProps) {
  const [job, setJob] = useState<JobStatusDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    detection: true, asr: true, cropping: true,
  });

  // ── Stage Results State (cached, fetched once) ──────────────────
  const [stage1, setStage1] = useState<Stage1ResultsResponse | null>(null);
  const [stage2, setStage2] = useState<Stage2ResultsResponse | null>(null);
  const [stage3, setStage3] = useState<Stage3ResultsResponse | null>(null);
  const [stageLoading, setStageLoading] = useState<Record<number, boolean>>({});

  // ── Video Preview Modal ─────────────────────────────────────────
  const [previewVideo, setPreviewVideo] = useState<{
    url: string; title: string; subtitle?: string;
  } | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatusRef = useRef<string | null>(null);

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
    } catch {
      // Stage not ready yet — silently ignore (400)
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
    const stage1Done = s === JOB_STATUS.TRANSCRIBING || s === JOB_STATUS.CROPPING || s === JOB_STATUS.READY_FOR_ANNOTATION;
    const stage2Done = s === JOB_STATUS.CROPPING || s === JOB_STATUS.READY_FOR_ANNOTATION;
    const stage3Done = s === JOB_STATUS.READY_FOR_ANNOTATION;

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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Gagal membatalkan job';
      setError(typeof msg === 'string' ? msg : 'Gagal membatalkan job');
    } finally {
      setCancelling(false);
    }
  };

  const handleCategoryChange = async (value: string) => {
    if (!job) return;
    try {
      await pipelineApi.updateJobCategory(jobId, { category: value as SignLanguageCategory });
      await fetchJob();
    } catch {
      // Silently fail category update
    }
  };

  const toggleStage = (name: string) => {
    setExpandedStages((prev) => ({ ...prev, [name]: !prev[name] }));
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
  const isFailed = job.status === JOB_STATUS.FAILED;
  const isCompleted = job.status === JOB_STATUS.READY_FOR_ANNOTATION;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      {/* Source Video Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
              <Video size={24} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Video Sumber</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">Job #{job.id.slice(0, 8)}</p>
              <div className="flex gap-3 mt-1 flex-wrap">
                <span className="text-xs text-gray-500">Dibuat: {formatDate(job.created_at)}</span>
                {job.category && (
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                    {job.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Combobox
              options={[
                { value: "SIBI", label: "SIBI" },
                { value: "BISINDO", label: "BISINDO" }
              ]}
              value={job.category || ''}
              onChange={(value) => handleCategoryChange(value)}
              placeholder="Kategori..."
              className="w-[130px] h-8 text-xs"
            />

            {isProcessing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-600 hover:bg-red-50"
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
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{job.error_message}</span>
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

      {/* ── Pipeline Stages ── */}
      {stages.map((stage) => (
        <div key={stage.name}>
          <StageConnector />
          <StageSection
            stage={stage}
            expanded={!!expandedStages[stage.name]}
            onToggle={() => toggleStage(stage.name)}
            jobId={jobId}
            stage1={stage1}
            stage2={stage2}
            stage3={stage3}
            stageLoading={!!stageLoading[stage.stageNumber]}
            onPreviewVideo={(url, title, subtitle) =>
              setPreviewVideo({ url, title, subtitle })
            }
          />
        </div>
      ))}

      {/* ── Completion Section ── */}
      {isCompleted && (
        <>
          <StageConnector />
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5">
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
                  <ExternalLink size={14} className="mr-1.5" /> Buka ASR Review
                </a>
              </Button>
              <Button variant="outline" className="border-emerald-300 text-emerald-700" asChild>
                <a href="/annotation">
                  <ExternalLink size={14} className="mr-1.5" /> Buka Annotation
                </a>
              </Button>
              {(job.curation_status === 'READY_TO_BE_NORMALIZED' || job.curation_status === 'NORMALIZED') && (
                <Button
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  asChild
                >
                  <a
                    href={pipelineApi.getDatasetDownloadUrl(jobId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={14} className="mr-1.5" /> Download Dataset
                  </a>
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Video Preview Modal ── */}
      {previewVideo && (
        <VideoPreviewModal
          open={!!previewVideo}
          onClose={() => setPreviewVideo(null)}
          videoUrl={previewVideo.url}
          title={previewVideo.title}
          subtitle={previewVideo.subtitle}
        />
      )}
    </div>
  );
}

// ── Sub-Components ──────────────────────────────────────────────────

function StageConnector() {
  return (
    <div className="flex justify-center py-1">
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-4 bg-gray-300" />
        <ArrowDown size={14} className="text-gray-400 -mt-1" />
      </div>
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
  onPreviewVideo: (url: string, title: string, subtitle?: string) => void;
}) {
  const sc = stageStatusConfig[stage.status];

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
      stage.status === 'failed' ? 'border-red-200' :
      stage.status === 'processing' ? 'border-amber-200' :
      'border-gray-200'
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          stage.status === 'done' ? 'bg-emerald-100 text-emerald-600' :
          stage.status === 'processing' ? 'bg-amber-100 text-amber-600' :
          stage.status === 'failed' ? 'bg-red-100 text-red-600' :
          'bg-gray-100 text-gray-400'
        }`}>
          {stage.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-800">{stage.label}</p>
            <Badge variant="outline" className={`text-[10px] ${sc.color}`}>
              {sc.icon} <span className="ml-1">{sc.label}</span>
            </Badge>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{stage.subtitle}</p>
        </div>
        <div className="text-gray-400 flex-shrink-0">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100">
          {stage.status === 'pending' && (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Clock size={16} className="mr-2" />
              <span className="text-sm">Menunggu tahap sebelumnya selesai...</span>
            </div>
          )}
          {stage.status === 'processing' && (
            <div className="flex items-center justify-center py-6 text-amber-600">
              <Loader2 size={16} className="mr-2 animate-spin" />
              <span className="text-sm">Sedang memproses...</span>
            </div>
          )}
          {stage.status === 'failed' && (
            <div className="flex items-center justify-center py-4 text-red-600">
              <AlertTriangle size={16} className="mr-2" />
              <span className="text-sm">Tahap ini gagal</span>
            </div>
          )}
          {stage.status === 'cancelled' && (
            <div className="flex items-center justify-center py-4 text-gray-400">
              <Ban size={16} className="mr-2" />
              <span className="text-sm">Dibatalkan</span>
            </div>
          )}

          {/* ── Stage Results (when done) ── */}
          {stage.status === 'done' && stageLoading && (
            <div className="flex items-center justify-center py-6 text-teal-600">
              <Loader2 size={16} className="mr-2 animate-spin" />
              <span className="text-sm">Memuat hasil...</span>
            </div>
          )}

          {stage.status === 'done' && !stageLoading && stage.stageNumber === 1 && (
            <Stage1Content results={stage1} onPreviewVideo={onPreviewVideo} />
          )}

          {stage.status === 'done' && !stageLoading && stage.stageNumber === 2 && (
            <Stage2Content results={stage2} jobId={jobId} />
          )}

          {stage.status === 'done' && !stageLoading && stage.stageNumber === 3 && (
            <Stage3Content results={stage3} onPreviewVideo={onPreviewVideo} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Stage 1 Results: Detection Segments ─────────────────────────────

function Stage1Content({
  results,
  onPreviewVideo,
}: {
  results: Stage1ResultsResponse | null;
  onPreviewVideo: (url: string, title: string, subtitle?: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const PREVIEW_LIMIT = 6;

  if (!results || results.results.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-emerald-600">
        <CheckCircle2 size={16} className="mr-2" />
        <span className="text-sm">Tahap selesai — belum ada segmen terdeteksi</span>
      </div>
    );
  }

  const segments = results.results;
  const hasMore = segments.length > PREVIEW_LIMIT;

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

        {hasMore && isExpanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="h-6 text-[10px] text-gray-500 hover:text-gray-700"
          >
            Sembunyikan
          </Button>
        )}
      </div>

      {!isExpanded ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {segments.slice(0, PREVIEW_LIMIT).map(seg => renderCard(seg))}
          </div>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="w-full text-xs border-teal-200 text-teal-700 hover:bg-teal-50 shadow-sm"
            >
              Lihat {segments.length - PREVIEW_LIMIT} Segmen Lainnya
              <ChevronDown size={14} className="ml-1.5" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-3 pb-4 pt-1 snap-x">
          {segments.map(seg => renderCard(seg, "w-[240px] snap-start"))}
        </div>
      )}
    </div>
  );
}

// ── Stage 2 Results: ASR Segment Cards (Collapsible) ────────────────

function Stage2Content({
  results,
  jobId,
}: {
  results: Stage2ResultsResponse | null;
  jobId: string;
}) {
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({});
  const PREVIEW_LIMIT = 5;

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
                {previewUtts.map((utt) => (
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
                  </div>
                ))}

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
}: {
  results: Stage3ResultsResponse | null;
  onPreviewVideo: (url: string, title: string, subtitle?: string) => void;
}) {
  const [selectedSegIdx, setSelectedSegIdx] = useState<number>(0);

  if (!results || results.results.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-emerald-600">
        <CheckCircle2 size={16} className="mr-2" />
        <span className="text-sm">Tahap selesai — belum ada video crop</span>
      </div>
    );
  }

  const { summary } = results;
  const segments = results.results;
  const selectedSegment = segments[selectedSegIdx];

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

      {/* 1. Horizontal Scroll Area for Segments with Sticky effect */}
      <div className="flex overflow-x-auto gap-3 pb-2 snap-x relative">
        {segments.map((segment, idx) => {
          const isSelected = idx === selectedSegIdx;
          return (
            <button
              key={segment.segment_id}
              onClick={() => setSelectedSegIdx(idx)}
              className={`flex-shrink-0 w-48 p-3 text-left transition-all border rounded-xl snap-start ${
                isSelected 
                  ? 'sticky left-0 z-10 bg-indigo-50 border-indigo-400 shadow-md ring-1 ring-indigo-400' 
                  : 'bg-white border-gray-200 hover:bg-gray-50 z-0 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="text-sm font-bold text-gray-800">Segmen #{idx + 1}</p>
                {segment.asr_review_flag && (
                  <AlertTriangle size={14} className="text-amber-500" />
                )}
              </div>
              <div className="mt-1.5 flex gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200">
                  {segment.utterances.length} Crop
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Expanded Area for Selected Segment's Utterances */}
      {selectedSegment && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Film size={14} className="text-indigo-500" />
            Video Cropping - Segmen #{selectedSegIdx + 1}
          </h4>
          <div className="flex overflow-x-auto gap-3 pb-2 snap-x">
            {selectedSegment.utterances.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Tidak ada data crop di segmen ini.</p>
            ) : (
              selectedSegment.utterances.map((utt) => {
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
                    className={`flex-shrink-0 w-64 snap-start rounded-xl border p-3 text-left transition-all ${
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
      )}

      {/* Link to Annotation page */}
      <div className="flex justify-center pt-2">
        <Button variant="outline" size="sm" className="text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50" asChild>
          <a href="/annotation">
            <ExternalLink size={12} className="mr-1" /> Buka Annotation
          </a>
        </Button>
      </div>
    </div>
  );
}
