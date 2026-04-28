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
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  activeUtterance?: { index: number; start: number; end: number } | null;
  allUtterances?: UtteranceCorrection[];
  onPrevUtterance?: () => void;
  onNextUtterance?: () => void;
  utteranceCount?: number;
  activeUtterancePosition?: number;
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

  // ── Frame extraction ──────────────────────────────────────────

  const frameCount = useMemo(() => {
    if (duration <= 0) return MIN_FRAMES;
    return Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, Math.ceil(duration)));
  }, [duration]);

  useEffect(() => {
    if (!videoUrl || duration <= 0) return;

    let cancelled = false;
    setIsExtracting(true);
    setFrames([]);

    const extractFrames = async () => {
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

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const aspectRatio = video.videoWidth / video.videoHeight;
      const thumbWidth = Math.round(THUMB_HEIGHT * aspectRatio);
      canvas.width = thumbWidth;
      canvas.height = THUMB_HEIGHT;

      const extracted: string[] = [];
      const interval = duration / frameCount;

      for (let i = 0; i < frameCount; i++) {
        if (cancelled) return;
        const seekTime = i * interval + interval / 2;
        video.currentTime = Math.min(seekTime, duration - 0.01);
        await new Promise<void>((resolve) => {
          video.onseeked = () => {
            ctx.drawImage(video, 0, 0, thumbWidth, THUMB_HEIGHT);
            extracted.push(canvas.toDataURL('image/jpeg', 0.6));
            resolve();
          };
        });
      }

      if (!cancelled) {
        setFrames(extracted);
        setIsExtracting(false);
      }
      video.src = '';
      video.load();
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
  }, [videoUrl, duration, frameCount]);

  // ── Position helpers ──────────────────────────────────────────

  const timeToInnerPx = useCallback(
    (time: number) => {
      if (duration <= 0 || innerWidth <= 0) return 0;
      return Math.max(0, Math.min(innerWidth, (time / duration) * innerWidth));
    },
    [duration, innerWidth]
  );

  const clientXToTime = useCallback(
    (clientX: number) => {
      if (!outerRef.current || duration <= 0 || innerWidth <= 0) return 0;
      const rect = outerRef.current.getBoundingClientRect();
      const scrollLeft = outerRef.current.scrollLeft;
      const innerX = clientX - rect.left + scrollLeft;
      return Math.max(0, Math.min(duration, (innerX / innerWidth) * duration));
    },
    [duration, innerWidth]
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
      setDragging(type);
      dragStartClientX.current = e.clientX;
      dragStartValues.current = { start: trimStart, end: trimEnd };
    },
    [trimStart, trimEnd]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!outerRef.current || duration <= 0 || innerWidth <= 0) return;
      const rect = outerRef.current.getBoundingClientRect();
      const scrollLeft = outerRef.current.scrollLeft;

      const startInnerX = dragStartClientX.current - rect.left + scrollLeft;
      const curInnerX = e.clientX - rect.left + scrollLeft;
      const deltaTime = ((curInnerX - startInnerX) / innerWidth) * duration;

      const origStart = dragStartValues.current.start;
      const origEnd = dragStartValues.current.end;

      if (dragging === 'start') {
        const newStart = Math.max(0, Math.min(origEnd - 0.05, origStart + deltaTime));
        onTrimChange(newStart, origEnd);
      } else if (dragging === 'end') {
        const newEnd = Math.max(origStart + 0.05, Math.min(duration, origEnd + deltaTime));
        onTrimChange(origStart, newEnd);
      } else {
        const regionDur = origEnd - origStart;
        let newStart = origStart + deltaTime;
        let newEnd = origEnd + deltaTime;
        if (newStart < 0) { newStart = 0; newEnd = regionDur; }
        if (newEnd > duration) { newEnd = duration; newStart = duration - regionDur; }
        onTrimChange(newStart, newEnd);
      }
    };

    const handleMouseUp = () => setDragging(null);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, duration, innerWidth, onTrimChange]);

  // ── Computed positions (in px on inner strip) ─────────────────

  const regionLeftPx = timeToInnerPx(trimStart);
  const regionRightPx = timeToInnerPx(trimEnd > 0 ? trimEnd : duration);
  const playheadPx = timeToInnerPx(currentTime);

  // ── Render ────────────────────────────────────────────────────

  return (
    <Card className="border-gray-200 shadow-sm p-2 bg-white">
      {/* ── Header: nav + zoom controls ── */}
      <div className="flex items-center gap-2 mb-2">

        {/* Utterance nav */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={onPrevUtterance}
            disabled={!onPrevUtterance || activeUtterancePosition === 1}
            className="h-7 px-2 text-xs gap-0.5">
            <ChevronLeft size={14} />
          </Button>
          {activeUtterancePosition !== undefined && utteranceCount !== undefined && (
            <Badge variant="outline" className="text-xs px-2 py-0.5 bg-teal-50 text-teal-600 border-teal-200 h-7">
              <Crosshair size={10} className="mr-1" />
              {activeUtterancePosition} / {utteranceCount}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={onNextUtterance}
            disabled={!onNextUtterance || activeUtterancePosition === utteranceCount}
            className="h-7 px-2 text-xs gap-0.5">
            <ChevronRight size={14} />
          </Button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Film size={14} className="text-teal-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-700 truncate">
            {activeUtterance ? `Utterance #${activeUtterance.index}` : 'Filmstrip Timeline'}
          </span>
        </div>

        {/* Timestamps */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-gray-500">
          <span className="text-teal-600 font-semibold">{formatTimestamp(trimStart)}</span>
          <span className="text-gray-400">→</span>
          <span className="text-teal-600 font-semibold">{formatTimestamp(trimEnd > 0 ? trimEnd : duration)}</span>
          <span className="text-gray-400">({((trimEnd > 0 ? trimEnd : duration) - trimStart).toFixed(1)}s)</span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-lg px-1 py-0.5">
          <button onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30 transition-colors"
            title="Zoom out">
            <ZoomOut size={12} />
          </button>
          <span className="text-xs font-mono text-gray-600 min-w-[32px] text-center select-none font-medium">
            {zoom.toFixed(1)}×
          </span>
          <button onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30 transition-colors"
            title="Zoom in">
            <ZoomIn size={12} />
          </button>
          {zoom > MIN_ZOOM && (
            <button onClick={handleZoomReset}
              className="p-1 rounded hover:bg-gray-200 text-gray-400 transition-colors"
              title="Reset zoom">
              <Maximize2 size={11} />
            </button>
          )}
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

          {/* Background regions for other utterances */}
          {allUtterances && activeUtterance && allUtterances.map((u) => {
            if (u.utterance_index === activeUtterance.index) return null;
            const left = timeToInnerPx(u.start);
            const width = timeToInnerPx(u.end) - left;
            return (
              <div key={`bg-${u.utterance_index}`}
                className="absolute top-0 bottom-0 border border-white/20 pointer-events-none"
                style={{ left: `${left}px`, width: `${width}px`, background: 'rgba(255,255,255,0.08)' }} />
            );
          })}

          {/* Active region border */}
          <div className="absolute top-0 bottom-0 border-2 border-teal-400 pointer-events-none rounded-sm"
            style={{ left: `${regionLeftPx}px`, width: `${regionRightPx - regionLeftPx}px` }} />

          {/* Drag handle — start */}
          <div className="absolute top-0 bottom-0 w-4 cursor-col-resize z-20 group flex items-center justify-center"
            style={{ left: `${regionLeftPx - 8}px` }}
            onMouseDown={(e) => handleMouseDown('start', e)}
            onClick={(e) => e.stopPropagation()}>
            <div className="w-1 h-full bg-teal-400 group-hover:bg-teal-300 transition-colors rounded-full" />
          </div>

          {/* Drag handle — end */}
          <div className="absolute top-0 bottom-0 w-4 cursor-col-resize z-20 group flex items-center justify-center"
            style={{ left: `${regionRightPx - 8}px` }}
            onMouseDown={(e) => handleMouseDown('end', e)}
            onClick={(e) => e.stopPropagation()}>
            <div className="w-1 h-full bg-teal-400 group-hover:bg-teal-300 transition-colors rounded-full" />
          </div>

          {/* Region drag overlay */}
          <div className="absolute top-0 bottom-0 z-10"
            style={{
              left: `${regionLeftPx}px`,
              width: `${regionRightPx - regionLeftPx}px`,
              cursor: dragging === 'region' ? 'grabbing' : 'grab',
            }}
            onMouseDown={(e) => handleMouseDown('region', e)}
            onClick={(e) => e.stopPropagation()} />

          {/* Playhead */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
            style={{ left: `${playheadPx}px` }}>
            <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Timestamp ruler */}
      <div className="flex items-center justify-between text-xs font-mono text-gray-400 mt-1.5 px-1">
        <span>{formatTimestamp(0)}</span>
        {duration > 0 && <span>{formatTimestamp(duration / 2)}</span>}
        <span>{formatTimestamp(duration)}</span>
      </div>
    </Card>
  );
}
