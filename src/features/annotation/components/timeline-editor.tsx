'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UtteranceCorrection } from '../annotation-types';
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Loader2,
  Film,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────

const THUMB_HEIGHT = 56;        // compact filmstrip height
const MAX_FRAMES = 30;
const MIN_FRAMES = 10;
const MIN_ZOOM = 1;             // 1× = fit-to-width
const MAX_ZOOM = 8;             // 8× = very detailed
const ZOOM_STEP = 0.5;

// ── Types ──────────────────────────────────────────────────────────

interface TimelineEditorProps {
  videoUrl: string;
  videoOffset?: number;   // segment-local time = global time + videoOffset
  nextVideoUrl?: string;  // N+1 segment video (when cross-segment)
  nextVideoBoundaryGlobal?: number; // global time where N ends / N+1 begins
  nextVideoOffset?: number; // offset for N+1's video
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  activeUtterance?: { index: number; start: number; end: number; status?: string; global_start?: number; global_end?: number } | null;
  allUtterances?: UtteranceCorrection[];
  onPrevUtterance?: () => void;
  onNextUtterance?: () => void;
  utteranceCount?: number;
  activeUtterancePosition?: number;
  // VIDEO-EDITOR-SIBI STYLE props
  disableTrimIn?: boolean;  // If true, only end marker is draggable (no trim-in)
  isMergedVideo?: boolean;  // If true, the video represents a physical merge (N + N+1)
  /** Global time of the merged tape's LEFT edge (the cascade floor). When the
   *  annotator trimmed in their own head this is BEFORE the start handle, so the
   *  region [mergedBaseGlobal, trimStart] renders as the recoverable gray head. */
  mergedBaseGlobal?: number;
  videoNDuration?: number;  // Duration of video N (for marker boundary line)
  /** Fires when filmstrip frame extraction completes (true) or starts (false) */
  onReady?: (ready: boolean) => void;
  /** Kunci seluruh interaksi trim — filmstrip hanya bisa dilihat & di-seek. */
  readOnly?: boolean;
  /** Alasan penguncian, dipakai sebagai tooltip & badge. */
  readOnlyReason?: string;
  // ── Lookback (materi milik kalimat N-1) ──
  /** Total detik kalimat N-1 yang sedang disambung di depan tape. */
  lookbackSeconds?: number;
  /** Bagian dari lookbackSeconds yang sudah dilepas kalimat N-1 — gratis diambil.
   *  Sisanya masih milik N-1 dan menariknya akan memendekkan kalimat itu. */
  lookbackOrphanSeconds?: number;
  /** Detik sisa potongan yang tersedia untuk disambung tanpa biaya. */
  lookbackAvailable?: number;
  /** Detik tambahan yang bisa diambil dengan memendekkan kalimat N-1. */
  lookbackBorrowable?: number;
  /** Apakah lookback sedang menyala. */
  lookbackOn?: boolean;
  /** Nyalakan/matikan lookback. Tombol disembunyikan kalau tidak diberikan. */
  onToggleLookback?: () => void;
  // ── Lookahead (tape lebih dalam: N+2, N+3) ──
  /** Berapa klip setelah N yang sedang ada di tape. */
  lookaheadDepth?: number;
  /** Berapa klip setelah N yang tersedia untuk disambung. */
  lookaheadAvailable?: number;
  /** Durasi tiap klip di tape, mulai dari N — untuk menandai tiap sambungan. */
  clipDurations?: number[];
  /** Tambah satu klip berikutnya ke tape. */
  onExtendLookahead?: () => void;
  /** Kembalikan tape ke bentuk polos [N | N+1]. */
  onResetLookahead?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

// ── Component ──────────────────────────────────────────────────────

export function TimelineEditor({
  videoUrl,
  videoOffset = 0,
  nextVideoUrl,
  nextVideoBoundaryGlobal,
  nextVideoOffset = 0,
  duration,
  currentTime,
  onTimeUpdate,
  trimStart,
  trimEnd,
  onTrimChange,
  activeUtterance,
  allUtterances,
  onPrevUtterance,
  onNextUtterance,
  utteranceCount,
  activeUtterancePosition,
  disableTrimIn = false,
  isMergedVideo = false,
  mergedBaseGlobal,
  videoNDuration = 0,
  onReady,
  readOnly = false,
  readOnlyReason,
  lookbackSeconds = 0,
  lookbackOrphanSeconds = 0,
  lookbackAvailable = 0,
  lookbackBorrowable = 0,
  lookbackOn = false,
  onToggleLookback,
  lookaheadDepth = 1,
  lookaheadAvailable = 0,
  clipDurations = [],
  onExtendLookahead,
  onResetLookahead,
}: TimelineEditorProps) {
  const outerRef = useRef<HTMLDivElement>(null);   // scrollable outer container
  const innerRef = useRef<HTMLDivElement>(null);    // zoomed inner strip
  const extractVideoRef = useRef<HTMLVideoElement | null>(null);

  const [frames, setFrames] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [outerWidth, setOuterWidth] = useState(0);
  const [zoom, setZoom] = useState(MIN_ZOOM);

  // Drag state
  const [dragging, setDragging] = useState<'start' | 'end' | 'region' | null>(null);
  const dragStartClientX = useRef(0);
  const dragStartValues = useRef({ start: 0, end: 0 });

  // ── Measure outer container ───────────────────────────────────

  useEffect(() => {
    if (!outerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setOuterWidth(entry.contentRect.width);
    });
    observer.observe(outerRef.current);
    return () => observer.disconnect();
  }, []);

  // Note: We intentionally do NOT lock OK utterances — users can re-sync anytime

  // ── Zoom helpers ──────────────────────────────────────────────

  const innerWidth = useMemo(() => outerWidth * zoom, [outerWidth, zoom]);

  const handleZoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(1)));
  const handleZoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(1)));
  const handleZoomReset = () => setZoom(MIN_ZOOM);

  // Auto-scroll so active utterance stays centered when zoom changes
  useEffect(() => {
    if (!outerRef.current || !activeUtterance || duration <= 0 || innerWidth <= 0) return;
    const mid = (activeUtterance.start + activeUtterance.end) / 2;
    const midPx = (mid / duration) * innerWidth;
    outerRef.current.scrollLeft = midPx - outerRef.current.clientWidth / 2;
  }, [zoom, activeUtterance, duration, innerWidth]);

  // ── Compute Window [N.start, N+1.end] — only show active + next ──
  const { windowStart, windowEnd, windowDuration } = useMemo(() => {
    if (!allUtterances || allUtterances.length === 0 || !activeUtterance) {
      return { windowStart: 0, windowEnd: duration, windowDuration: duration };
    }
    const idx = activeUtterance.index;
    const next = allUtterances[idx + 1];

    // Window starts at the merged tape's floor (so the recoverable gray head
    // [floor, start] is on the canvas); falls back to the utterance start.
    const wStart = (isMergedVideo && mergedBaseGlobal !== undefined)
      ? mergedBaseGlobal
      : (activeUtterance.global_start ?? activeUtterance.start);
    let wEnd = next ? (next.global_end ?? next.end) : (activeUtterance.global_end ?? activeUtterance.end);
    
    // FIX: If we are using a physical merged video, its exact duration dictates the end of the playable
    // window. This overrides the ASR-based global_end timestamps which may be shorter than the physical video.
    if (isMergedVideo && duration > 0) {
      wEnd = wStart + duration;
    }
    
    const wDur = Math.max(0.1, wEnd - wStart);
    
    return { windowStart: wStart, windowEnd: wEnd, windowDuration: wDur };
  }, [allUtterances, activeUtterance, duration, isMergedVideo, mergedBaseGlobal]);

  // ── Frame extraction ──────────────────────────────────────────

  const frameCount = useMemo(() => {
    if (windowDuration <= 0) return MIN_FRAMES;
    return Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, Math.ceil(windowDuration)));
  }, [windowDuration]);

  useEffect(() => {
    if (!videoUrl || duration <= 0) return;

    let cancelled = false;
    setIsExtracting(true);
    onReady?.(false);
    setFrames([]);

    const extractFrames = async () => {
      // Primary video (utterance N's segment)
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'auto';
      extractVideoRef.current = video;

      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video for filmstrip'));
        video.src = videoUrl;
      });

      // Secondary video (utterance N+1's segment, only when cross-segment)
      let nextVideo: HTMLVideoElement | null = null;
      if (nextVideoUrl) {
        nextVideo = document.createElement('video');
        nextVideo.crossOrigin = 'anonymous';
        nextVideo.muted = true;
        nextVideo.preload = 'auto';
        await new Promise<void>((resolve) => {
          nextVideo!.onloadeddata = () => resolve();
          nextVideo!.onerror = () => resolve(); // fail silently
          nextVideo!.src = nextVideoUrl;
        });
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const aspectRatio = video.videoWidth / video.videoHeight || 16 / 9;
      const thumbWidth = Math.round(THUMB_HEIGHT * aspectRatio);
      canvas.width = thumbWidth;
      canvas.height = THUMB_HEIGHT;

      const extracted: string[] = [];
      const interval = windowDuration / frameCount;

      for (let i = 0; i < frameCount; i++) {
        if (cancelled) return;
        // Grab the frame at the START of this thumbnail's slot, not its middle.
        // Each thumbnail is drawn filling its slot from the LEFT edge, so a frame
        // taken from the midpoint put the imagery half a slot to the left of the
        // moment it belongs to, while the playhead sat at the true time. With
        // interval ≈ 1s that is a ~0.5s disagreement between the line and the
        // hands — enough to make a cut point look wrong and, on longer windows
        // where the slot grows, worse still.
        const seekGlobal = windowStart + i * interval;

        // Decide which video to use: N's or N+1's segment
        const useNextVideo =
          nextVideo && nextVideoBoundaryGlobal !== undefined && seekGlobal >= nextVideoBoundaryGlobal;
        const targetVideo = useNextVideo ? nextVideo! : video;
        const offset = useNextVideo ? nextVideoOffset : videoOffset;
        const seekTime = seekGlobal + offset;

        targetVideo.currentTime = Math.min(Math.max(0, seekTime), targetVideo.duration - 0.01);
        await new Promise<void>((resolve) => {
          targetVideo.onseeked = () => {
            ctx.drawImage(targetVideo, 0, 0, thumbWidth, THUMB_HEIGHT);
            extracted.push(canvas.toDataURL('image/jpeg', 0.6));
            resolve();
          };
        });
      }

      if (!cancelled) {
        setFrames(extracted);
        setIsExtracting(false);
        onReady?.(true);
      }
      video.src = '';
      video.load();
      if (nextVideo) { nextVideo.src = ''; nextVideo.load(); }
      extractVideoRef.current = null;
    };

    extractFrames().catch(() => {
      if (!cancelled) setIsExtracting(false);
    });

    return () => {
      cancelled = true;
      if (extractVideoRef.current) {
        extractVideoRef.current.src = '';
        extractVideoRef.current.load();
        extractVideoRef.current = null;
      }
    };
  }, [videoUrl, videoOffset, nextVideoUrl, nextVideoOffset, nextVideoBoundaryGlobal, duration, frameCount]);

  // ── Position helpers ──────────────────────────────────────────

  const timeToInnerPx = useCallback(
    (time: number) => {
      if (windowDuration <= 0 || innerWidth <= 0) return 0;
      if (time < windowStart) return 0;
      if (time > windowEnd) return innerWidth;
      return ((time - windowStart) / windowDuration) * innerWidth;
    },
    [windowDuration, windowStart, windowEnd, innerWidth]
  );

  const clientXToTime = useCallback(
    (clientX: number) => {
      if (!outerRef.current || windowDuration <= 0 || innerWidth <= 0) return windowStart;
      const rect = outerRef.current.getBoundingClientRect();
      const scrollLeft = outerRef.current.scrollLeft;
      const innerX = clientX - rect.left + scrollLeft;
      const t = windowStart + (innerX / innerWidth) * windowDuration;
      return Math.max(windowStart, Math.min(windowEnd, t));
    },
    [windowDuration, windowStart, windowEnd, innerWidth]
  );

  // ── Click to seek ─────────────────────────────────────────────

  const handleFilmstripClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) return;
      onTimeUpdate(clientXToTime(e.clientX));
    },
    [dragging, clientXToTime, onTimeUpdate]
  );

  // ── Drag handlers ─────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (type: 'start' | 'end' | 'region', e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      // Filmstrip terkunci — tidak ada handle yang bisa digeser sama sekali.
      if (readOnly) return;
      // VIDEO-EDITOR-SIBI STYLE: disable trim-in (start drag and region drag)
      if (disableTrimIn && (type === 'start' || type === 'region')) return;
      setDragging(type);
      dragStartClientX.current = e.clientX;
      dragStartValues.current = { start: trimStart, end: trimEnd };
    },
    [trimStart, trimEnd, disableTrimIn, readOnly]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!outerRef.current || windowDuration <= 0 || innerWidth <= 0) return;
      const rect = outerRef.current.getBoundingClientRect();
      const scrollLeft = outerRef.current.scrollLeft;

      const startInnerX = dragStartClientX.current - rect.left + scrollLeft;
      const curInnerX = e.clientX - rect.left + scrollLeft;
      const deltaTime = ((curInnerX - startInnerX) / innerWidth) * windowDuration;

      const origStart = dragStartValues.current.start;
      const origEnd = dragStartValues.current.end;

      const TRIM_THRESHOLD = 0.001;

      if (dragging === 'start') {
        const newStart = Math.max(windowStart, Math.min(origEnd - 0.05, origStart + deltaTime));
        if (Math.abs(newStart - origStart) > TRIM_THRESHOLD) {
          onTrimChange(newStart, origEnd);
        }
      } else if (dragging === 'end') {
        const newEnd = Math.max(origStart + 0.05, Math.min(windowEnd, origEnd + deltaTime));
        if (Math.abs(newEnd - origEnd) > TRIM_THRESHOLD) {
          onTrimChange(origStart, newEnd);
        }
      } else {
        // Region drag disabled in SIBI style
        if (disableTrimIn) return;
        const regionDur = origEnd - origStart;
        let newStart = origStart + deltaTime;
        let newEnd = origEnd + deltaTime;
        if (newStart < windowStart) { newStart = windowStart; newEnd = windowStart + regionDur; }
        if (newEnd > windowEnd) { newEnd = windowEnd; newStart = windowEnd - regionDur; }
        if (Math.abs(newStart - origStart) > TRIM_THRESHOLD || Math.abs(newEnd - origEnd) > TRIM_THRESHOLD) {
          onTrimChange(newStart, newEnd);
        }
      }
    };

    const handleMouseUp = () => setDragging(null);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, windowDuration, innerWidth, onTrimChange]);

  // ── Computed positions (in px on inner strip) ─────────────────

  const regionLeftPx = timeToInnerPx(trimStart);
  const regionRightPx = timeToInnerPx(trimEnd > 0 ? trimEnd : windowEnd);
  const playheadPx = timeToInnerPx(currentTime);
  // Right edge of the prepended lookback zone, clamped to the start handle so the
  // two bands never overlap when the annotator drags back into it.
  const lookbackPx = lookbackSeconds > 0
    ? Math.min(timeToInnerPx(windowStart + lookbackSeconds), regionLeftPx)
    : 0;
  // Inside that zone, the boundary between what kalimat N-1 already released
  // (free) and what it still owns (taking it shortens N-1).
  const lookbackBorrowSeconds = Math.max(0, lookbackSeconds - lookbackOrphanSeconds);
  const lookbackBorrowPx = lookbackBorrowSeconds > 0
    ? Math.min(timeToInnerPx(windowStart + lookbackBorrowSeconds), lookbackPx)
    : 0;
  // True once the start handle has actually been dragged into N-1's own material.
  const isBorrowingFromPrev = lookbackBorrowSeconds > 0 && regionLeftPx < lookbackBorrowPx - 0.5;

  // Every joint between clips in the tape, so a deeper lookahead marks N+1|N+2 too.
  const clipJoints = useMemo(() => {
    if (!isMergedVideo || clipDurations.length < 2) return [];
    const joints: number[] = [];
    let acc = windowStart + lookbackSeconds;
    for (let i = 0; i < clipDurations.length - 1; i++) {
      acc += clipDurations[i];
      joints.push(acc);
    }
    return joints;
  }, [isMergedVideo, clipDurations, windowStart, lookbackSeconds]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <Card className="border-gray-200 shadow-sm px-1 py-0.5 bg-white">
      {/* ── Header: info + zoom controls ── */}
      <div className="flex items-center justify-between gap-2 mb-0.5 px-0.5">
        {/* Left: Position badge & Title */}
        <div className="flex items-center gap-2 min-w-0">
          {activeUtterancePosition !== undefined && utteranceCount !== undefined && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 bg-teal-50 text-teal-600 border-teal-200 h-5">
              <Crosshair size={12} className="mr-1" />
              {activeUtterancePosition} / {utteranceCount}
            </Badge>
          )}
          <Film size={14} className="text-teal-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-700 truncate">
            {activeUtterance ? `Kalimat ke-${activeUtterance.index + 1}` : 'Filmstrip Timeline'}
          </span>
          {readOnly && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 py-0 bg-slate-100 text-slate-500 border-slate-300 h-5 flex-shrink-0"
              title={readOnlyReason}
            >
              <Lock size={10} className="mr-1" />
              Terkunci
            </Badge>
          )}
        </div>

        {/* Right: Lookback toggle, timestamps & zoom controls */}
        <div className="flex items-center gap-3">
          {/* Lookback — sambung materi kalimat sebelumnya ke depan tape */}
          {onToggleLookback && !readOnly && (() => {
            const reachable = lookbackAvailable + lookbackBorrowable;
            return (
              <button
                onClick={onToggleLookback}
                disabled={reachable <= 0 && !lookbackOn}
                title={
                  reachable > 0 || lookbackOn
                    ? `Sambungkan bagian akhir kalimat sebelumnya agar batas awal bisa ditarik mundur.${
                        lookbackBorrowable > 0
                          ? ` ${lookbackAvailable.toFixed(1)}s sisa potongan (bebas) + ${lookbackBorrowable.toFixed(1)}s milik kalimat sebelumnya — menarik ke bagian ini akan memendekkan kalimat itu.`
                          : ''
                      }`
                    : 'Tidak ada bagian kalimat sebelumnya yang bisa disambung'
                }
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  isBorrowingFromPrev
                    ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
                    : lookbackOn
                    ? 'bg-sky-100 border-sky-300 text-sky-700 hover:bg-sky-200'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft size={12} />
                {isBorrowingFromPrev
                  ? `Memendekkan kalimat sebelumnya (${lookbackBorrowSeconds > 0 ? (lookbackBorrowSeconds - Math.max(0, (trimStart - windowStart))).toFixed(1) : '0.0'}s)`
                  : lookbackOn
                  ? `Konteks aktif (${lookbackSeconds.toFixed(1)}s)`
                  : reachable > 0
                  ? `Konteks sebelumnya (${reachable.toFixed(1)}s)`
                  : 'Konteks sebelumnya'}
              </button>
            );
          })()}

          {/* Lookahead — tambah klip berikutnya kalau isyarat yang dicari ada di N+2/N+3 */}
          {onExtendLookahead && !readOnly && (lookaheadAvailable > 1 || lookaheadDepth > 1) && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={onExtendLookahead}
                disabled={lookaheadDepth >= lookaheadAvailable}
                title="Sambungkan satu kalimat berikutnya lagi ke tape, untuk kasus isyarat yang dibutuhkan baru muncul di baris ke-2 atau ke-3"
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  lookaheadDepth > 1
                    ? 'bg-violet-100 border-violet-300 text-violet-700 hover:bg-violet-200'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronRight size={12} />
                {lookaheadDepth > 1 ? `+${lookaheadDepth} kalimat` : 'Kalimat berikutnya'}
              </button>
              {lookaheadDepth > 1 && onResetLookahead && (
                <button
                  onClick={onResetLookahead}
                  title="Kembalikan tape ke dua klip"
                  className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-500 text-xs hover:bg-gray-100 transition-colors"
                >
                  reset
                </button>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-gray-500">
            <span className="text-teal-600 font-medium">{formatTimestamp(Math.max(0, trimStart - windowStart))}</span>
            <span className="text-gray-400">→</span>
            <span className="text-teal-600 font-medium">{formatTimestamp(Math.max(0, (trimEnd > 0 ? trimEnd : windowEnd) - windowStart))}</span>
            <span className="text-gray-400">({((trimEnd > 0 ? trimEnd : windowEnd) - trimStart).toFixed(1)}s)</span>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded px-1 py-0.5">
            <button onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM}
              className="p-0.5 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30 transition-colors"
              title="Zoom out">
              <ZoomOut size={12} />
            </button>
            <span className="text-xs font-mono text-gray-600 min-w-[28px] text-center select-none font-medium">
              {zoom.toFixed(1)}×
            </span>
            <button onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM}
              className="p-0.5 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30 transition-colors"
              title="Zoom in">
              <ZoomIn size={12} />
            </button>
            {zoom > MIN_ZOOM && (
              <button onClick={handleZoomReset}
                className="p-0.5 rounded hover:bg-gray-200 text-gray-400 transition-colors"
                title="Reset zoom">
                <Maximize2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable filmstrip ── */}
      <div
        ref={outerRef}
        className="relative overflow-x-auto overflow-y-hidden rounded-md border border-gray-200 bg-gray-900 select-none"
        style={{ height: `${THUMB_HEIGHT + 8}px`, cursor: dragging ? 'grabbing' : 'pointer' }}
        onClick={handleFilmstripClick}
      >
        {/* Inner strip — zoomed width */}
        <div
          ref={innerRef}
          className="relative h-full"
          style={{ width: innerWidth > 0 ? `${innerWidth}px` : '100%', minWidth: '100%' }}
        >
          {/* Thumbnail frames */}
          {isExtracting ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs">Generating filmstrip...</span>
            </div>
          ) : frames.length > 0 ? (
            <div className="flex h-full w-full">
              {frames.map((src, i) => (
                <img key={i} src={src} alt="" className="h-full object-cover flex-1 min-w-0" draggable={false} />
              ))}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <span className="text-xs">Memuat video...</span>
            </div>
          )}

          {/* Dimmed overlay outside active region */}
          <div className="absolute top-0 bottom-0 left-0 bg-black/50 pointer-events-none"
            style={{ width: `${regionLeftPx}px` }} />
          <div className="absolute top-0 bottom-0 bg-black/50 pointer-events-none"
            style={{ left: `${regionRightPx}px`, right: 0 }} />

          {/* Background regions for other utterances (only N+1 visible) */}
          {allUtterances && activeUtterance && allUtterances.map((u, idx) => {
            if (idx === activeUtterance.index) return null;
            // Use global timestamps for positioning
            const uGlobalStart = u.global_start ?? u.start;
            const uGlobalEnd = u.global_end ?? u.end;
            if (uGlobalEnd <= windowStart || uGlobalStart >= windowEnd) return null;

            const left = timeToInnerPx(uGlobalStart);
            const width = timeToInnerPx(uGlobalEnd) - left;
            const isOk = u.status === 'OK';

            return (
              <div key={`bg-${u.utterance_index}-${idx}`}
                className={`absolute top-0 bottom-0 border pointer-events-none flex items-center justify-center ${isOk ? 'border-gray-400/50 bg-gray-500/30' : 'border-white/20 bg-white/5'}`}
                style={{ left: `${left}px`, width: `${width}px` }}>
                {isOk && <Badge variant="outline" className="text-[10px] scale-75 bg-gray-800/80 text-gray-200 border-gray-600 backdrop-blur-sm px-1.5">🔒 OK</Badge>}
              </div>
            );
          })}

          {/* Active region border — abu-abu saat terkunci, teal saat bisa di-trim */}
          <div className={`absolute top-0 bottom-0 border-2 pointer-events-none rounded-sm ${readOnly ? 'border-slate-400' : 'border-teal-400'}`}
            style={{ left: `${regionLeftPx}px`, width: `${regionRightPx - regionLeftPx}px` }} />

          {/* Lookback zone, part 1 — material kalimat N-1 STILL OWNS. Dragging the
              start handle in here shortens that kalimat, so it is marked in red
              rather than presented as free space. */}
          {lookbackBorrowPx > 4 && (
            <div className="absolute top-0 bottom-0 left-0 z-10 pointer-events-none bg-rose-500/25 border-r border-dashed border-rose-300/70 flex items-center justify-center overflow-hidden"
              style={{ width: `${lookbackBorrowPx}px` }}>
              <span className="text-[9px] text-rose-50 bg-black/60 px-1 py-0.5 rounded whitespace-nowrap select-none">
                ⚠ milik kalimat sebelumnya
              </span>
            </div>
          )}

          {/* Lookback zone, part 2 — the orphan tail kalimat N-1 already released.
              Free to take; sits between the borrow zone and this utterance's own
              recoverable head. */}
          {lookbackPx - lookbackBorrowPx > 4 && (
            <div className="absolute top-0 bottom-0 z-10 pointer-events-none bg-sky-400/20 border-r border-dashed border-sky-300/70 flex items-center justify-center overflow-hidden"
              style={{ left: `${lookbackBorrowPx}px`, width: `${lookbackPx - lookbackBorrowPx}px` }}>
              <span className="text-[9px] text-sky-100 bg-black/55 px-1 py-0.5 rounded whitespace-nowrap select-none">
                sisa kalimat sebelumnya
              </span>
            </div>
          )}

          {/* Recoverable gray head — the annotator's OWN left trim-in [floor, start].
              Still in the tape, so the start handle can be dragged back over it. */}
          {isMergedVideo && mergedBaseGlobal !== undefined && regionLeftPx - lookbackPx > 4 && (
            <div className="absolute top-0 bottom-0 z-10 pointer-events-none bg-amber-400/15 border-r border-dashed border-amber-300/70 flex items-center justify-center overflow-hidden"
              style={{ left: `${lookbackPx}px`, width: `${regionLeftPx - lookbackPx}px` }}>
              <span className="text-[9px] text-amber-100 bg-black/55 px-1 py-0.5 rounded whitespace-nowrap select-none">
                ↤ bisa ditarik kembali
              </span>
            </div>
          )}

          {/* Marker boundary lines where clips join. With a deeper lookahead the
              tape has more than one seam, so every joint is marked — otherwise the
              annotator cannot tell which row a piece of footage came from.
              Falls back to the single videoNDuration seam when per-clip durations
              are not available (older backend). */}
          {clipJoints.length > 0 && activeUtterance
            ? clipJoints.map((jointTime, i) => (
                <div key={i} className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/70 z-25 pointer-events-none"
                  style={{ left: `${timeToInnerPx(jointTime)}px` }}
                  title={`Batas sambungan kalimat ke-${i + 1} dan ke-${i + 2} di tape`}>
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full" />
                  <div className="absolute top-1 left-2 text-[9px] text-yellow-300 font-semibold whitespace-nowrap bg-black/60 px-1 rounded pointer-events-none select-none">
                    ✂️ {clipJoints.length > 1 ? `Sambungan ${i + 1}` : 'Sambungan'}
                  </div>
                </div>
              ))
            : videoNDuration > 0 && activeUtterance && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/70 z-25 pointer-events-none"
                  style={{ left: `${timeToInnerPx(windowStart + lookbackSeconds + videoNDuration)}px` }}
                  title="Batas sambungan video pertama dan kedua">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full" />
                  <div className="absolute top-1 left-2 text-[9px] text-yellow-300 font-semibold whitespace-nowrap bg-black/60 px-1 rounded pointer-events-none select-none">
                    ✂️ Sambungan
                  </div>
                </div>
              )}

          {/* Drag handle — start (hidden in SIBI style) */}
          {!readOnly && !disableTrimIn && (
            <div className="absolute top-0 bottom-0 w-4 cursor-col-resize z-20 group flex items-center justify-center"
              style={{ left: `${regionLeftPx - 8}px` }}
              onMouseDown={(e) => handleMouseDown('start', e)}
              onClick={(e) => e.stopPropagation()}>
              <div className="w-1 h-full bg-teal-400 group-hover:bg-teal-300 transition-colors rounded-full" />
            </div>
          )}

          {/* Drag handle — end */}
          {!readOnly && (
            <div className="absolute top-0 bottom-0 w-4 cursor-col-resize z-20 group flex items-center justify-center"
              style={{ left: `${regionRightPx - 8}px` }}
              onMouseDown={(e) => handleMouseDown('end', e)}
              onClick={(e) => e.stopPropagation()}>
              <div className="w-1 h-full bg-teal-400 group-hover:bg-teal-300 transition-colors rounded-full" />
            </div>
          )}

          {/* Region drag overlay (hidden in SIBI style) */}
          {!readOnly && !disableTrimIn && (
            <div className="absolute top-0 bottom-0 z-10"
              style={{
                left: `${regionLeftPx}px`,
                width: `${regionRightPx - regionLeftPx}px`,
                cursor: dragging === 'region' ? 'grabbing' : 'grab',
              }}
              onMouseDown={(e) => handleMouseDown('region', e)}
              onClick={(e) => e.stopPropagation()} />
          )}

          {/* Playhead */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
            style={{ left: `${playheadPx}px` }}>
            <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Timestamp ruler */}
      <div className="flex items-center justify-between text-xs font-mono text-gray-400 mt-0.5 px-1">
        <span>{formatTimestamp(0)}</span>
        {windowDuration > 0 && <span>{formatTimestamp(windowDuration / 2)}</span>}
        <span>{formatTimestamp(windowDuration)}</span>
      </div>
    </Card>
  );
}
