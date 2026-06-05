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
        const seekGlobal = windowStart + i * interval + interval / 2;

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
      // VIDEO-EDITOR-SIBI STYLE: disable trim-in (start drag and region drag)
      if (disableTrimIn && (type === 'start' || type === 'region')) return;
      setDragging(type);
      dragStartClientX.current = e.clientX;
      dragStartValues.current = { start: trimStart, end: trimEnd };
    },
    [trimStart, trimEnd, disableTrimIn]
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
        </div>

        {/* Right: Timestamps & Zoom controls */}
        <div className="flex items-center gap-3">
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

          {/* Active region border */}
          <div className="absolute top-0 bottom-0 border-2 pointer-events-none rounded-sm border-teal-400"
            style={{ left: `${regionLeftPx}px`, width: `${regionRightPx - regionLeftPx}px` }} />

          {/* Recoverable gray head — the annotator's OWN left trim-in [floor, start].
              Still in the tape, so the start handle can be dragged back over it. */}
          {isMergedVideo && mergedBaseGlobal !== undefined && regionLeftPx > 4 && (
            <div className="absolute top-0 bottom-0 left-0 z-10 pointer-events-none bg-amber-400/15 border-r border-dashed border-amber-300/70 flex items-center justify-center overflow-hidden"
              style={{ width: `${regionLeftPx}px` }}>
              <span className="text-[9px] text-amber-100 bg-black/55 px-1 py-0.5 rounded whitespace-nowrap select-none">
                ↤ bisa ditarik kembali
              </span>
            </div>
          )}

          {/* Marker boundary line where the two clips join — sits videoNDuration
              after the tape's left edge (windowStart = floor), not after the handle. */}
          {videoNDuration > 0 && activeUtterance && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/70 z-25 pointer-events-none"
              style={{ left: `${timeToInnerPx(windowStart + videoNDuration)}px` }}
              title="Batas sambungan video pertama dan kedua">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full" />
              <div className="absolute top-1 left-2 text-[9px] text-yellow-300 font-semibold whitespace-nowrap bg-black/60 px-1 rounded pointer-events-none select-none">
                ✂️ Sambungan
              </div>
            </div>
          )}

          {/* Drag handle — start (hidden in SIBI style) */}
          {!disableTrimIn && (
            <div className="absolute top-0 bottom-0 w-4 cursor-col-resize z-20 group flex items-center justify-center"
              style={{ left: `${regionLeftPx - 8}px` }}
              onMouseDown={(e) => handleMouseDown('start', e)}
              onClick={(e) => e.stopPropagation()}>
              <div className="w-1 h-full bg-teal-400 group-hover:bg-teal-300 transition-colors rounded-full" />
            </div>
          )}

          {/* Drag handle — end */}
          <div className="absolute top-0 bottom-0 w-4 cursor-col-resize z-20 group flex items-center justify-center"
            style={{ left: `${regionRightPx - 8}px` }}
            onMouseDown={(e) => handleMouseDown('end', e)}
            onClick={(e) => e.stopPropagation()}>
            <div className="w-1 h-full bg-teal-400 group-hover:bg-teal-300 transition-colors rounded-full" />
          </div>

          {/* Region drag overlay (hidden in SIBI style) */}
          {!disableTrimIn && (
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
