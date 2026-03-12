'use client';

import { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Settings2 } from 'lucide-react';
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

  // Sync play state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play();
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
      <div className="bg-black relative flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
          onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
          onClick={() => onPlayPause(!isPlaying)}
        />
      </div>
      <div className="bg-gray-50 flex items-center p-2 gap-2 border-t border-gray-200">
        <Button variant="ghost" size="icon" onClick={() => onPlayPause(!isPlaying)}>
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
