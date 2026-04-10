'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Play,
  RotateCcw,
  Minus,
  Plus,
  Timer,
  Wand2,
  Eye,
  Shield,
  FileText,
  Video,
} from 'lucide-react';
import { annotationApi } from '../annotation-api';
import type {
  AnnotationSyncResponse,
  StitchPreviewResponse,
} from '../annotation-types';
import { SYNC_STATUS } from '../annotation-types';

// ── Types ──────────────────────────────────────────────────────────

interface SyncWorkbenchProps {
  editId: string;
  segmentId: string;
  onSyncStatusChange?: (status: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────

function formatMs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

const syncStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  UNSYNCED: { label: 'Belum Sync', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: <Unlock size={10} /> },
  PARTIAL: { label: 'Sebagian', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Timer size={10} /> },
  SYNCED: { label: 'Tersinkron', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <CheckCircle2 size={10} /> },
  LOCKED: { label: 'Terkunci', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Lock size={10} /> },
};

// ── Component ──────────────────────────────────────────────────────

export function SyncWorkbench({ editId, segmentId, onSyncStatusChange }: SyncWorkbenchProps) {
  const [expanded, setExpanded] = useState(true);
  const [sync, setSync] = useState<AnnotationSyncResponse | null>(null);
  const [preview, setPreview] = useState<StitchPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tuning, setTuning] = useState(false);
  const [validating, setValidating] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Glosa local state (debounced save)
  const [glosaInput, setGlosaInput] = useState('');
  const glosaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stabilize callback ref to prevent infinite loop
  const onSyncStatusChangeRef = useRef(onSyncStatusChange);
  onSyncStatusChangeRef.current = onSyncStatusChange;

  // ── Fetch Sync Data ──────────────────────────────────────────

  const fetchSync = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await annotationApi.getSyncData(editId);
      setSync(data);
      setGlosaInput(data.glosa || '');
      onSyncStatusChangeRef.current?.(data.sync_status);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Gagal memuat sync data';
      setError(typeof msg === 'string' ? msg : 'Gagal memuat sync data');
    } finally {
      setLoading(false);
    }
  }, [editId]);

  useEffect(() => {
    fetchSync();
  }, [fetchSync]);

  // Cleanup glosa debounce timer on unmount
  useEffect(() => {
    return () => {
      if (glosaTimer.current) clearTimeout(glosaTimer.current);
    };
  }, []);

  // ── Fine-Tune ──────────────────────────────────────────────────

  const handleFineTune = async (adjustmentMs: number, target: 'start' | 'end') => {
    setTuning(true);
    setMessage(null);
    try {
      const result = await annotationApi.fineTuneSync(editId, {
        adjustment_ms: adjustmentMs,
        target,
      });
      setMessage(result.message);
      await fetchSync();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Fine-tune gagal';
      setMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Fine-tune gagal');
    } finally {
      setTuning(false);
    }
  };

  // ── Update Boundaries (Glosa + offsets) ────────────────────────

  const handleGlosaChange = (value: string) => {
    setGlosaInput(value);
    if (glosaTimer.current) clearTimeout(glosaTimer.current);
    glosaTimer.current = setTimeout(async () => {
      try {
        await annotationApi.updateSyncBoundaries(editId, { glosa: value });
        await fetchSync();
      } catch {
        // Silently fail glosa save
      }
    }, 800);
  };

  // ── Validate ──────────────────────────────────────────────────

  const handleValidate = async (indicators: { text_match: boolean; video_complete: boolean; sync_locked: boolean }) => {
    setValidating(true);
    setMessage(null);
    try {
      const result = await annotationApi.validateSync(editId, indicators);
      if (result.warnings.length > 0) {
        setMessage(`⚠️ ${result.warnings.join(', ')}`);
      } else if (result.is_valid) {
        setMessage(`✅ Sync status: ${result.sync_status}`);
      }
      await fetchSync();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Validasi gagal';
      setMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Validasi gagal');
    } finally {
      setValidating(false);
    }
  };

  // ── Preview ────────────────────────────────────────────────────

  const handlePreview = async () => {
    setPreviewLoading(true);
    setMessage(null);
    try {
      const data = await annotationApi.getStitchedPreview(editId);
      setPreview(data);
      setMessage(`Preview dimuat (${data.total_duration.toFixed(1)}s${data.requires_stitching ? ' — stitched' : ''})`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Gagal memuat preview';
      setMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal memuat preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="py-3 px-4 flex flex-row items-center gap-2">
          <Loader2 size={14} className="text-teal-600 animate-spin" />
          <span className="text-sm text-gray-500">Memuat sync data...</span>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 shadow-sm">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSync} className="text-xs h-7">
            <RotateCcw size={12} className="mr-1" /> Retry
          </Button>
        </CardHeader>
      </Card>
    );
  }

  if (!sync) return null;

  const sc = syncStatusConfig[sync.sync_status] || syncStatusConfig.UNSYNCED;
  const videoStart = sync.video_start_offset ?? sync.audio_start;
  const videoEnd = sync.video_end_offset ?? sync.audio_end;
  const isLocked = sync.sync_status === SYNC_STATUS.LOCKED;

  return (
    <Card className="border-gray-200 shadow-sm">
      {/* ── Header ── */}
      <CardHeader
        className="py-2.5 px-4 flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Wand2 size={14} className="text-indigo-500" />
          Sync Workbench
          <Badge variant="outline" className={`text-[9px] ${sc.color} gap-0.5`}>
            {sc.icon} {sc.label}
          </Badge>
          {sync.extension_seconds > 0 && (
            <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 border-amber-200">
              +{sync.extension_seconds.toFixed(1)}s extension
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {message && (
            <span className="text-[10px] text-gray-500 max-w-[200px] truncate">{message}</span>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          {/* ── Timeline Range Visualizer ── */}
          <div className="space-y-2">
            <Label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <Timer size={10} /> Timeline
            </Label>
            <div className="relative h-14 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              {/* Calculate positions */}
              {(() => {
                const totalRange = Math.max(videoEnd, sync.audio_end) + 2;
                const minPos = Math.max(0, Math.min(videoStart, sync.audio_start) - 1);
                const scale = 100 / (totalRange - minPos);

                const audioLeft = (sync.audio_start - minPos) * scale;
                const audioWidth = (sync.audio_end - sync.audio_start) * scale;
                const videoLeft = (videoStart - minPos) * scale;
                const videoWidth = (videoEnd - videoStart) * scale;

                return (
                  <>
                    {/* Audio range (gray, bottom layer) */}
                    <div
                      className="absolute top-2 h-4 bg-gray-300/80 rounded-sm flex items-center justify-center"
                      style={{ left: `${audioLeft}%`, width: `${Math.max(audioWidth, 1)}%` }}
                    >
                      <span className="text-[8px] text-gray-600 font-mono whitespace-nowrap px-1">
                        Audio
                      </span>
                    </div>

                    {/* Video range (blue, top layer) */}
                    <div
                      className="absolute top-7 h-5 bg-indigo-400/80 rounded-sm flex items-center justify-center shadow-sm"
                      style={{ left: `${videoLeft}%`, width: `${Math.max(videoWidth, 1)}%` }}
                    >
                      <span className="text-[8px] text-white font-mono whitespace-nowrap px-1">
                        Video
                      </span>
                    </div>
                  </>
                );
              })()}

              {/* Labels */}
              <div className="absolute bottom-0.5 left-1 text-[8px] font-mono text-gray-400">
                Audio: {formatMs(sync.audio_start)} → {formatMs(sync.audio_end)}
              </div>
              <div className="absolute top-0.5 right-1 text-[8px] font-mono text-indigo-500">
                Video: {formatMs(videoStart)} → {formatMs(videoEnd)}
              </div>
            </div>

            {/* Duration info */}
            <div className="flex gap-3 text-[10px] text-gray-400">
              <span>Audio: <strong className="text-gray-600">{sync.audio_duration.toFixed(2)}s</strong></span>
              <span>Video: <strong className="text-indigo-600">{sync.video_duration.toFixed(2)}s</strong></span>
              <span>Presisi: <strong className="text-gray-600">{sync.precision_ms}ms</strong></span>
            </div>
          </div>

          {/* ── Fine-Tune Buttons ── */}
          <div className="space-y-2">
            <Label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <Wand2 size={10} /> Fine-Tune
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Start controls */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-gray-500">Start Boundary</span>
                <div className="flex gap-1">
                  {[-500, -100, 100, 500].map((ms) => (
                    <Tooltip key={`start-${ms}`}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] font-mono flex-1 px-0"
                          onClick={() => handleFineTune(ms, 'start')}
                          disabled={tuning || isLocked}
                        >
                          {ms > 0 ? <Plus size={8} className="mr-0.5" /> : <Minus size={8} className="mr-0.5" />}
                          {Math.abs(ms)}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{ms > 0 ? 'Geser start ke kanan' : 'Geser start ke kiri'} {Math.abs(ms)}ms</p></TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* End controls */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-gray-500">End Boundary</span>
                <div className="flex gap-1">
                  {[-500, -100, 100, 500].map((ms) => (
                    <Tooltip key={`end-${ms}`}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] font-mono flex-1 px-0"
                          onClick={() => handleFineTune(ms, 'end')}
                          disabled={tuning || isLocked}
                        >
                          {ms > 0 ? <Plus size={8} className="mr-0.5" /> : <Minus size={8} className="mr-0.5" />}
                          {Math.abs(ms)}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{ms > 0 ? 'Geser end ke kanan' : 'Geser end ke kiri'} {Math.abs(ms)}ms</p></TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
            {tuning && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-500">
                <Loader2 size={12} className="animate-spin" /> Adjusting...
              </div>
            )}
          </div>

          {/* ── Glosa Input ── */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <FileText size={10} /> Glosa (Notasi Bahasa Isyarat)
            </Label>
            <Input
              value={glosaInput}
              onChange={(e) => handleGlosaChange(e.target.value)}
              placeholder="Contoh: SAYA MAKAN NASI RESTORAN"
              className="h-8 text-sm font-mono uppercase"
              disabled={isLocked}
            />
            <p className="text-[9px] text-gray-400">Tulis notasi gloss untuk gerakan JBI yang terlihat di video.</p>
          </div>

          {/* ── Sync Quality Indicators ── */}
          <div className="space-y-2">
            <Label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <Shield size={10} /> Indikator Kualitas Sync
            </Label>
            <div className="space-y-1.5">
              {/* TEXT_MATCH */}
              <button
                onClick={() => handleValidate({
                  text_match: !sync.indicators.text_match,
                  video_complete: sync.indicators.video_complete,
                  sync_locked: sync.indicators.sync_locked,
                })}
                disabled={validating || isLocked}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                  sync.indicators.text_match
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                  sync.indicators.text_match ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  <CheckCircle2 size={12} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">TEXT_MATCH</p>
                  <p className="text-[10px] text-gray-400">Teks transkripsi sesuai dengan audio</p>
                </div>
              </button>

              {/* VIDEO_COMPLETE */}
              <button
                onClick={() => handleValidate({
                  text_match: sync.indicators.text_match,
                  video_complete: !sync.indicators.video_complete,
                  sync_locked: sync.indicators.sync_locked,
                })}
                disabled={validating || isLocked}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                  sync.indicators.video_complete
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                  sync.indicators.video_complete ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  <Video size={12} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">VIDEO_COMPLETE</p>
                  <p className="text-[10px] text-gray-400">Gerakan JBI terekam lengkap dalam video</p>
                </div>
              </button>

              {/* SYNC_LOCKED */}
              <button
                onClick={() => {
                  if (isLocked) return; // Can't unlock via this button
                  if (!sync.indicators.text_match || !sync.indicators.video_complete) {
                    setMessage('⚠️ Set TEXT_MATCH dan VIDEO_COMPLETE terlebih dahulu');
                    return;
                  }
                  handleValidate({
                    text_match: sync.indicators.text_match,
                    video_complete: sync.indicators.video_complete,
                    sync_locked: true,
                  });
                }}
                disabled={validating || isLocked || (!sync.indicators.text_match || !sync.indicators.video_complete)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                  sync.indicators.sync_locked
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                } ${(!sync.indicators.text_match || !sync.indicators.video_complete) && !isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                  sync.indicators.sync_locked ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  <Lock size={12} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">SYNC_LOCKED</p>
                  <p className="text-[10px] text-gray-400">Alignment final — tidak bisa diubah lagi</p>
                </div>
              </button>
            </div>
            {validating && (
              <div className="flex items-center gap-1.5 text-xs text-blue-500">
                <Loader2 size={12} className="animate-spin" /> Memvalidasi...
              </div>
            )}
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={previewLoading || isLocked}
              className="text-xs gap-1"
            >
              {previewLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
              Preview Stitched
            </Button>

            {isLocked && (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-0.5">
                <Lock size={9} /> Sync Terkunci
              </Badge>
            )}
          </div>

          {/* ── Preview Player ── */}
          {preview && (
            <div className="space-y-2">
              <Label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1">
                <Play size={10} /> Preview Video
              </Label>
              <div className="bg-black rounded-lg overflow-hidden">
                <video
                  src={preview.video_url}
                  controls
                  className="w-full max-h-[200px] object-contain"
                  preload="metadata"
                >
                  <track kind="captions" />
                </video>
              </div>
              <div className="flex gap-3 text-[10px] text-gray-400 flex-wrap">
                <span>Durasi: <strong className="text-gray-600">{preview.total_duration.toFixed(2)}s</strong></span>
                <span>Start: <strong className="text-gray-600">{formatMs(preview.stitched_start)}</strong></span>
                <span>End: <strong className="text-gray-600">{formatMs(preview.stitched_end)}</strong></span>
                {preview.requires_stitching && (
                  <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-600 border-purple-200">
                    Multi-segment stitch
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
