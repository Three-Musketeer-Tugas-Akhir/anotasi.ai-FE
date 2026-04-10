'use client';

import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Settings2, Video, Loader2, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VideoPlayerProps {
  src: string;
  isPlaying: boolean;
  onPlayPause: (playing: boolean) => void;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  onDurationChange: (duration: number) => void;
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
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // ── Build the playable video URL ──────────────────────────────
  // The backend now returns video_url with an embedded streaming token:
  //   /api/v1/assets/jobs/.../segment.mp4?token=eyJ...
  // This can be used directly as <video src="..."> because the
  // Next.js rewrite proxy forwards query params to the backend,
  // which authenticates via the ?token= parameter.
  useEffect(() => {
    if (!src) {
      setVideoUrl(null);
      return;
    }

    // The src from the backend already contains ?token= for auth
    // Just use it directly — the Next.js rewrite proxies it to backend
    setVideoUrl(src);
    setVideoError(null);
  }, [src]);

  // Sync play state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Sync time if difference is large (e.g. seeking from timeline)
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.1) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  return (
    <Card className="flex flex-col overflow-hidden border-gray-200 shadow-sm h-full max-h-[400px]">
      {/* Video area */}
      <div className="bg-black relative flex-1 flex items-center justify-center">
        {videoError ? (
          <div className="flex flex-col items-center justify-center text-red-400 py-12 px-4 text-center">
            <AlertTriangle size={28} className="mb-2" />
            <p className="text-xs">{videoError}</p>
          </div>
        ) : videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
            onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
            onClick={() => onPlayPause(!isPlaying)}
            onError={() => setVideoError('Gagal memuat video. Coba refresh halaman.')}
            preload="metadata"
          >
            <track kind="captions" />
          </video>
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

      {/* Controls */}
      <div className="bg-gray-50 flex items-center p-2 gap-2 border-t border-gray-200">
        <Button variant="ghost" size="icon" onClick={() => onPlayPause(!isPlaying)} disabled={!videoUrl}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </Button>

        <div className="flex-1 text-sm text-gray-600 font-mono">
          {currentTime.toFixed(2)}s
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 font-mono text-xs">
              <Settings2 size={14} /> {playbackRate}x
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <DropdownMenuItem key={rate} onClick={() => onPlaybackRateChange(rate)}>
                {rate}x {rate === 1 && '(Normal)'}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
