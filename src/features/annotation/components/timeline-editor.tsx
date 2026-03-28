'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { Card } from '@/components/ui/card';
import { VideoTrimData } from './properties-panel';

interface TimelineEditorProps {
  videoUrl: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  trimData: VideoTrimData;
  onTrimChange: (start: number, end: number) => void;
}

export function TimelineEditor({
  videoUrl,
  duration,
  currentTime,
  isPlaying,
  onTimeUpdate,
  trimData,
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
        // Prevent infinite loop if updated from external
        if (Math.abs(wavesurfer.current!.getCurrentTime() - currentTime) > 0.1) {
          onTimeUpdate(time);
        }
      });
      
      // Region events handling for drag/resize
      wsRegions.current.on('region-updated', (region) => {
         onTrimChange(region.start, region.end);
      });
    }

    return () => {
      // Cleanup on unmount handled strictly
    };
  }, []);

  // Load Video Audio to WaveSurfer
  useEffect(() => {
    if (wavesurfer.current && videoUrl) {
      setIsReady(false);
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

    const currentEnd = trimData.end > 0 ? trimData.end : duration;
    const currentStart = trimData.start >= 0 ? trimData.start : 0;

    wsRegions.current?.addRegion({
      id: "main-trim",
      start: currentStart,
      end: currentEnd,
      color: 'rgba(20, 184, 166, 0.4)', // Teal color mapping the final cut range
      drag: true,
      resize: true,
    });
  }, [trimData.start, trimData.end, isReady, duration]);

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
          <div className="w-3 h-3 bg-teal-500/40 border border-teal-500 rounded-sm"></div>
          <span>Area video yang akan di-export (Bisa digeser)</span>
        </div>
      </div>
    </Card>
  );
}
