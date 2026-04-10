'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { Card } from '@/components/ui/card';

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
  const [isReady, setIsReady] = useState(false);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    if (!wavesurfer.current) {
      wsRegions.current = RegionsPlugin.create();

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
        plugins: [wsRegions.current],
      });

      wavesurfer.current.on('ready', () => {
        setIsReady(true);
      });

      wavesurfer.current.on('timeupdate', (time) => {
        if (wavesurfer.current && Math.abs(wavesurfer.current.getCurrentTime() - currentTime) > 0.1) {
          onTimeUpdate(time);
        }
      });

      // Region events handling for drag/resize
      wsRegions.current.on('region-updated', (region) => {
        onTrimChange(region.start, region.end);
      });
    }

    return () => {
      // Cleanup handled on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Video Audio to WaveSurfer
  // The videoUrl from backend now includes ?token= for streaming auth.
  // WaveSurfer's internal fetch will use this URL directly via the
  // Next.js rewrite proxy, which preserves query params including the token.
  useEffect(() => {
    if (wavesurfer.current && videoUrl) {
      setIsReady(false);
      // Use the URL directly — the ?token= param handles auth
      wavesurfer.current.load(videoUrl);
    }
  }, [videoUrl]);

  // Sync external Play/Pause
  useEffect(() => {
    if (wavesurfer.current && isReady) {
      if (isPlaying) {
        wavesurfer.current.play();
      } else {
        wavesurfer.current.pause();
      }
    }
  }, [isPlaying, isReady]);

  // Sync external Time
  useEffect(() => {
    if (wavesurfer.current && isReady) {
      if (Math.abs(wavesurfer.current.getCurrentTime() - currentTime) > 0.1) {
        wavesurfer.current.setTime(currentTime);
      }
    }
  }, [currentTime, isReady]);

  // Single region for Video Trimmer
  useEffect(() => {
    if (!wsRegions.current || !isReady || duration === 0) return;

    wsRegions.current.clearRegions();

    const regionEnd = trimEnd > 0 ? trimEnd : duration;
    const regionStart = trimStart >= 0 ? trimStart : 0;

    wsRegions.current.addRegion({
      id: 'main-trim',
      start: regionStart,
      end: regionEnd,
      color: 'rgba(20, 184, 166, 0.4)',
      drag: true,
      resize: true,
    });
  }, [trimStart, trimEnd, isReady, duration]);

  return (
    <Card className="flex flex-col border-gray-200 shadow-sm p-4 relative">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800">Visual Trimmer</h3>
        {!isReady && <span className="text-xs text-gray-400">Loading waveform...</span>}
      </div>

      <div className="w-full relative bg-gray-50 border border-gray-200 rounded-md overflow-hidden">
        <div ref={containerRef} className="w-full relative z-10" />
      </div>

      <div className="mt-4 text-xs text-gray-500 flex gap-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-teal-500/40 border border-teal-500 rounded-sm" />
          <span>Area video yang akan di-export (Bisa digeser)</span>
        </div>
      </div>
    </Card>
  );
}
