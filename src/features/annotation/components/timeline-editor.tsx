'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.esm.js';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ZoomIn,
  Maximize2,
  Focus,
  Minus,
  Plus,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────

/** Minimum zoom: fit entire waveform in container */
const MIN_PX_PER_SEC = 0;
/** Maximum zoom: very detailed view */
const MAX_PX_PER_SEC = 800;
/** Default zoom level for "fit to view" */
const DEFAULT_PX_PER_SEC = 0;
/** Zoom step for button clicks */
const ZOOM_STEP = 50;
/** Zoom multiplier for double-click */
const DOUBLE_CLICK_ZOOM_FACTOR = 4;

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
}

// ── Helpers ────────────────────────────────────────────────────────

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function getZoomLabel(pxPerSec: number, containerWidth: number, duration: number): string {
  if (duration === 0) return '1×';
  const fitPxPerSec = containerWidth / duration;
  if (fitPxPerSec === 0) return '1×';
  const ratio = Math.max(1, pxPerSec / fitPxPerSec);
  return `${ratio.toFixed(1)}×`;
}

// ── Component ──────────────────────────────────────────────────────

export function TimelineEditor({
  videoUrl,
  duration,
  currentTime,
  isPlaying,
  onTimeUpdate,
  trimStart,
  trimEnd,
  onTrimChange,
}: TimelineEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const wsRegions = useRef<RegionsPlugin | null>(null);
  const zoomPlugin = useRef<ReturnType<typeof ZoomPlugin.create> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_PX_PER_SEC);

  // Track whether we're programmatically updating the region to avoid feedback loops
  const isUpdatingRegion = useRef(false);
  // Track container width for zoom ratio display
  const containerWidthRef = useRef(0);

  // ── Initialize WaveSurfer ───────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    if (!wavesurfer.current) {
      wsRegions.current = RegionsPlugin.create();

      // ZoomPlugin: enables pinch-to-zoom on trackpad and scroll-wheel zoom
      zoomPlugin.current = ZoomPlugin.create({
        scale: 0.5,
        maxZoom: MAX_PX_PER_SEC,
        deltaThreshold: 5,
        exponentialZooming: false,
      });

      wavesurfer.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#d1d5db',
        progressColor: '#0f766e',
        cursorColor: '#ef4444',
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 100,
        normalize: true,
        minPxPerSec: DEFAULT_PX_PER_SEC,
        autoScroll: true,
        autoCenter: true,
        plugins: [wsRegions.current, zoomPlugin.current],
      });

      wavesurfer.current.on('ready', () => {
        setIsReady(true);
        // Measure container width for zoom ratio
        if (containerRef.current) {
          containerWidthRef.current = containerRef.current.clientWidth;
        }
      });

      wavesurfer.current.on('timeupdate', (time) => {
        if (wavesurfer.current && Math.abs(wavesurfer.current.getCurrentTime() - currentTime) > 0.1) {
          onTimeUpdate(time);
        }
      });

      // Track zoom level changes from ZoomPlugin (scroll wheel / trackpad)
      wavesurfer.current.on('zoom', (minPxPerSec: number) => {
        setZoomLevel(minPxPerSec);
      });

      // Region events handling for drag/resize
      wsRegions.current.on('region-updated', (region) => {
        if (!isUpdatingRegion.current) {
          onTrimChange(region.start, region.end);
        }
      });
    }

    return () => {
      // Cleanup handled on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load Video Audio ────────────────────────────────────────────

  useEffect(() => {
    if (wavesurfer.current && videoUrl) {
      setIsReady(false);
      setZoomLevel(DEFAULT_PX_PER_SEC);
      wavesurfer.current.load(videoUrl);
    }
  }, [videoUrl]);

  // ── Sync external Play/Pause ────────────────────────────────────

  useEffect(() => {
    if (wavesurfer.current && isReady) {
      if (isPlaying) {
        wavesurfer.current.play();
      } else {
        wavesurfer.current.pause();
      }
    }
  }, [isPlaying, isReady]);

  // ── Sync external Time ──────────────────────────────────────────

  useEffect(() => {
    if (wavesurfer.current && isReady) {
      if (Math.abs(wavesurfer.current.getCurrentTime() - currentTime) > 0.1) {
        wavesurfer.current.setTime(currentTime);
      }
    }
  }, [currentTime, isReady]);

  // ── Region management ───────────────────────────────────────────

  useEffect(() => {
    if (!wsRegions.current || !isReady || duration === 0) return;

    isUpdatingRegion.current = true;
    wsRegions.current.clearRegions();

    const regionEnd = trimEnd > 0 ? trimEnd : duration;
    const regionStart = trimStart >= 0 ? trimStart : 0;

    wsRegions.current.addRegion({
      id: 'main-trim',
      start: regionStart,
      end: regionEnd,
      color: 'rgba(20, 184, 166, 0.35)',
      drag: true,
      resize: true,
    });

    // Reset the flag after a tick so user interactions are captured
    requestAnimationFrame(() => {
      isUpdatingRegion.current = false;
    });
  }, [trimStart, trimEnd, isReady, duration]);

  // ── Zoom Controls ───────────────────────────────────────────────

  const applyZoom = useCallback((newLevel: number) => {
    if (!wavesurfer.current) return;
    const clamped = Math.max(MIN_PX_PER_SEC, Math.min(MAX_PX_PER_SEC, newLevel));
    wavesurfer.current.zoom(clamped);
    setZoomLevel(clamped);
  }, []);

  const handleZoomIn = useCallback(() => {
    applyZoom(zoomLevel + ZOOM_STEP);
  }, [zoomLevel, applyZoom]);

  const handleZoomOut = useCallback(() => {
    applyZoom(zoomLevel - ZOOM_STEP);
  }, [zoomLevel, applyZoom]);

  const handleFitToView = useCallback(() => {
    applyZoom(0);
  }, [applyZoom]);

  /** Zoom to fit the current trim region into the viewport */
  const handleFocusTrim = useCallback(() => {
    if (!wavesurfer.current || !containerRef.current) return;
    const regionStart = trimStart >= 0 ? trimStart : 0;
    const regionEnd = trimEnd > 0 ? trimEnd : duration;
    const regionDuration = regionEnd - regionStart;
    if (regionDuration <= 0) return;

    const containerWidth = containerRef.current.clientWidth;
    // Calculate px/sec needed to fit region into ~80% of container width (leave padding)
    const targetPxPerSec = (containerWidth * 0.8) / regionDuration;
    const clamped = Math.min(MAX_PX_PER_SEC, targetPxPerSec);
    
    wavesurfer.current.zoom(clamped);
    setZoomLevel(clamped);

    // Scroll to center the region after zoom
    requestAnimationFrame(() => {
      if (!wavesurfer.current) return;
      const scrollTarget = regionStart * clamped - containerWidth * 0.1;
      wavesurfer.current.setScroll(Math.max(0, scrollTarget));
    });
  }, [trimStart, trimEnd, duration, applyZoom]);

  /** Double-click handler: zoom into the clicked position */
  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!wavesurfer.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const containerWidth = rect.width;

    // Calculate the time position that was clicked
    const scroll = wavesurfer.current.getScroll();
    const currentPxPerSec = zoomLevel || (containerWidth / (duration || 1));
    const clickedTime = (scroll + clickX) / currentPxPerSec;

    // Determine new zoom level
    const newZoom = zoomLevel <= MIN_PX_PER_SEC
      ? Math.max(ZOOM_STEP, (containerWidth / (duration || 1)) * DOUBLE_CLICK_ZOOM_FACTOR)
      : MIN_PX_PER_SEC; // If already zoomed, double-click resets to fit

    wavesurfer.current.zoom(newZoom);
    setZoomLevel(newZoom);

    // Scroll to center the clicked position
    if (newZoom > MIN_PX_PER_SEC) {
      requestAnimationFrame(() => {
        if (!wavesurfer.current) return;
        const scrollTarget = clickedTime * newZoom - containerWidth / 2;
        wavesurfer.current.setScroll(Math.max(0, scrollTarget));
      });
    }
  }, [zoomLevel, duration]);

  // ── Zoom level display ──────────────────────────────────────────

  const isZoomed = zoomLevel > MIN_PX_PER_SEC;
  const zoomLabel = isReady
    ? getZoomLabel(zoomLevel, containerWidthRef.current, duration)
    : '1×';

  // ── Render ──────────────────────────────────────────────────────

  return (
    <Card className="flex flex-col border-gray-200 shadow-sm p-4 relative">
      {/* Header Row */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">Visual Trimmer</h3>
          {isZoomed && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200">
              <ZoomIn size={8} className="mr-0.5" />
              {zoomLabel}
            </Badge>
          )}
          {!isReady && <span className="text-xs text-gray-400">Loading waveform...</span>}
        </div>

        {/* Zoom Controls */}
        {isReady && (
          <div className="flex items-center gap-1">
            {/* Fit to View */}
            <button
              onClick={handleFitToView}
              className={`p-1.5 rounded-md transition-colors text-xs ${
                !isZoomed
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
              disabled={!isZoomed}
              title="Fit to view (reset zoom)"
            >
              <Maximize2 size={13} />
            </button>

            {/* Focus on Trim Region */}
            <button
              onClick={handleFocusTrim}
              className="p-1.5 rounded-md hover:bg-teal-50 text-teal-600 hover:text-teal-700 transition-colors"
              title="Zoom ke area trim"
            >
              <Focus size={13} />
            </button>

            {/* Zoom Slider / Buttons */}
            <div className="flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-lg px-1 py-0.5 ml-1">
              <button
                onClick={handleZoomOut}
                className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-30"
                disabled={zoomLevel <= MIN_PX_PER_SEC}
                title="Zoom out"
              >
                <Minus size={12} />
              </button>
              <span className="text-[10px] font-mono text-gray-500 min-w-[32px] text-center select-none">
                {zoomLabel}
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-30"
                disabled={zoomLevel >= MAX_PX_PER_SEC}
                title="Zoom in"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Waveform Container */}
      <div
        className={`w-full relative bg-gray-50 border border-gray-200 rounded-md overflow-hidden transition-all ${
          isZoomed ? 'ring-1 ring-blue-200' : ''
        }`}
      >
        <div
          ref={containerRef}
          className="w-full relative z-10"
          onDoubleClick={handleDoubleClick}
          style={{ cursor: isZoomed ? 'grab' : 'default' }}
        />

        {/* Zoom hint overlay — only when waveform is loaded and not zoomed */}
        {isReady && !isZoomed && duration > 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-1.5 z-20">
            <span className="text-[9px] text-gray-400 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-gray-100">
              Scroll / Pinch untuk zoom · Double-click untuk fokus
            </span>
          </div>
        )}
      </div>

      {/* Footer: Legend + Timestamps */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-teal-500/35 border border-teal-500 rounded-sm" />
            <span>Area trim (geser/resize)</span>
          </div>
          {isZoomed && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-50 border border-blue-300 rounded-sm" />
              <span>Mode zoom aktif</span>
            </div>
          )}
        </div>

        {/* Trim region timestamp display */}
        {isReady && duration > 0 && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
            <span className="text-teal-600 font-semibold">{formatTimestamp(trimStart)}</span>
            <span className="text-gray-300">→</span>
            <span className="text-teal-600 font-semibold">{formatTimestamp(trimEnd > 0 ? trimEnd : duration)}</span>
            <span className="text-gray-400 ml-1">
              ({((trimEnd > 0 ? trimEnd : duration) - trimStart).toFixed(1)}s)
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
