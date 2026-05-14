'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Settings2, Video, Loader2, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface VideoPlayerProps {
  src: string;
  isPlaying: boolean;
  onPlayPause: (playing: boolean) => void;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  onDurationChange: (duration: number) => void;
  onEnded?: () => void;
  /** Fires when video element is ready to play */
  onReady?: (ready: boolean) => void;
  /** If true, play is externally blocked (e.g. filmstrip not ready) */
  playDisabled?: boolean;
}

export function VideoPlayer({
  src,
  isPlaying,
  onPlayPause,
  currentTime,
  onTimeUpdate,
  playbackRate,
  onPlaybackRateChange,
  onDurationChange,
  onEnded,
  onReady,
  playDisabled = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  // ── Sync State ─────────────────────────────────────────────────────────
  const lastReportedTimeRef = useRef(currentTime);
  const isSeekingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  // ── Build the playable video URL ──────────────────────────────
  useEffect(() => {
    setVideoError(null);
    setVideoReady(false);
    onReady?.(false);
    if (!src) { setVideoUrl(null); return; }
    setVideoUrl(src);
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Video ready handler ────────────────────────────────────────
  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
    onReady?.(true);
  }, [onReady]);

  // ── Sync play state ────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // ── rAF playhead polling (60fps smooth red marker) ────────────
  useEffect(() => {
    if (!isPlaying) {
      // Cancel any pending rAF when paused
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const tick = () => {
      if (videoRef.current && !isSeekingRef.current) {
        const t = videoRef.current.currentTime;
        lastReportedTimeRef.current = t;
        onTimeUpdate(t);
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying, onTimeUpdate]);

  // ── Sync currentTime from external source (e.g., clicking utterance/timeline) ──
  useEffect(() => {
    if (!videoRef.current) return;

    // If the new prop time is significantly different from what we last reported,
    // it means the user clicked somewhere to seek.
    if (Math.abs(currentTime - lastReportedTimeRef.current) > 0.1) {
      const applySeek = () => {
        if (!videoRef.current) return;
        isSeekingRef.current = true;
        videoRef.current.currentTime = currentTime;
        lastReportedTimeRef.current = currentTime;

        // Fallback: force-clear seeking flag after 500ms if seeked never fires
        setTimeout(() => { isSeekingRef.current = false; }, 500);
      };

      // If video metadata isn't loaded yet, setting currentTime will fail.
      // Wait for it to be ready.
      if (videoRef.current.readyState >= 1) {
        applySeek();
      } else {
        videoRef.current.addEventListener('loadedmetadata', applySeek, { once: true });
      }
    }
  }, [currentTime]);

  const handleSeeked = () => {
    isSeekingRef.current = false;
  };

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // ── Play attempt handler (guards) ──────────────────────────────
  const handlePlayAttempt = useCallback((wantPlay: boolean) => {
    if (wantPlay && (playDisabled || !videoReady)) {
      toast.info('Tunggu sebentar, video sedang dimuat...', {
        position: 'top-center',
        duration: 2000,
      });
      return;
    }
    onPlayPause(wantPlay);
  }, [playDisabled, videoReady, onPlayPause]);

  const isDisabled = playDisabled || !videoReady;

  return (
    <Card className="flex flex-col overflow-hidden border-gray-200 shadow-sm bg-black">
      {/* Video area — natural aspect ratio, no excess black bars */}
      <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
        {videoError ? (
          <div className="flex flex-col items-center justify-center text-red-400 py-12 px-4 text-center">
            <AlertTriangle size={28} className="mb-2" />
            <p className="text-xs">{videoError}</p>
          </div>
        ) : videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              className="absolute inset-0 w-full h-full object-contain"
              onSeeked={handleSeeked}
              onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
              onClick={() => handlePlayAttempt(!isPlaying)}
              onError={() => setVideoError('Gagal memuat video. Coba refresh halaman.')}
              onEnded={onEnded}
              onCanPlay={handleCanPlay}
              preload="metadata"
              muted={isMuted}
            >
              <track kind="captions" />
            </video>

            {/* Loading overlay when not ready */}
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                <Loader2 size={28} className="text-teal-400 animate-spin" />
              </div>
            )}

            {/* ── Centered play/pause overlay ── */}
            <button
              onClick={() => handlePlayAttempt(!isPlaying)}
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
              } ${!videoReady ? 'z-20' : ''}`}
              style={{ background: isPlaying ? 'transparent' : 'rgba(0,0,0,0.25)' }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <span
                className={`flex items-center justify-center rounded-full bg-white/90 shadow-xl transition-transform duration-150 ${
                  isPlaying ? 'w-14 h-14 scale-90' : 'w-20 h-20 scale-100'
                }`}
              >
                {isPlaying
                  ? <Pause size={28} className="text-gray-800 ml-0" />
                  : <Play size={36} className="text-teal-600 ml-2" />
                }
              </span>
            </button>
          </>
        ) : !src ? (
          <div className="flex flex-col items-center justify-center text-gray-500 py-12">
            <Video size={32} className="opacity-40 mb-2" />
            <p className="text-xs">Video belum tersedia</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 py-12">
            <Loader2 size={28} className="animate-spin mb-2" />
            <p className="text-xs">Memuat video...</p>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-gray-900 flex items-center px-3 py-1.5 gap-3 border-t border-gray-700">
        {/* Play/Pause button — prominent */}
        <button
          onClick={() => handlePlayAttempt(!isPlaying)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
            isDisabled
              ? 'bg-gray-600 cursor-not-allowed opacity-50'
              : 'bg-teal-500 hover:bg-teal-400'
          }`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
        </button>

        {/* Time display */}
        <span className="text-sm font-mono text-gray-300 flex-1">
          {new Date(currentTime * 1000).toISOString().substr(14, 8)}
        </span>

        {/* Volume toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="w-8 h-8 rounded hover:bg-gray-700 flex items-center justify-center transition-colors flex-shrink-0 text-gray-300 hover:text-white"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* Speed selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 font-mono text-sm text-gray-300 hover:text-white hover:bg-gray-700 h-8 px-2">
              <Settings2 size={14} /> {playbackRate}×
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <DropdownMenuItem key={rate} onClick={() => onPlaybackRateChange(rate)}>
                {rate}× {rate === 1 && '(Normal)'}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
