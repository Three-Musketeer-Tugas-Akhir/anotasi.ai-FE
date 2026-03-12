'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { Card } from '@/components/ui/card';
import { AnnotationData } from './properties-panel';

interface TimelineEditorProps {
  videoUrl: string;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  annotations: AnnotationData[];
  selectedId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onAnnotationChange: (id: string, updates: Partial<AnnotationData>) => void;
}

export function TimelineEditor({
  videoUrl,
  currentTime,
  isPlaying,
  onTimeUpdate,
  annotations,
  selectedId,
  onSelectAnnotation,
  onAnnotationChange
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
         onAnnotationChange(region.id, { start: region.start, end: region.end });
      });

      wsRegions.current.on('region-clicked', (region, e) => {
        e.stopPropagation();
        onSelectAnnotation(region.id);
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

  // Re-render Regions when annotations change (except during drag to avoid stuttering)
  // For simplicity here, we clear and re-add if lengths differ, or update existing bounds
  useEffect(() => {
    if (!wsRegions.current || !isReady) return;

    // A deeper sync logic can be implemented, but for demo:
    wsRegions.current.clearRegions();

    annotations.forEach((ann) => {
      const isSelected = ann.id === selectedId;
      wsRegions.current?.addRegion({
        id: ann.id,
        start: ann.start,
        end: ann.end,
        color: isSelected ? 'rgba(20, 184, 166, 0.4)' : 'rgba(20, 184, 166, 0.2)', // Teal color
        drag: true,
        resize: true,
      });
    });
  }, [annotations, isReady, selectedId]);

  return (
    <Card className="flex flex-col border-gray-200 shadow-sm p-4 relative">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800">Timeline Editor</h3>
        {!isReady && <span className="text-xs text-gray-400">Loading waveform...</span>}
      </div>
      
      <div 
        className="w-full relative bg-gray-50 border border-gray-200 rounded-md overflow-hidden cursor-text"
        onClick={() => onSelectAnnotation(null)}
      >
        <div ref={containerRef} className="w-full relative z-10" />
        
        {/* Layer 1: ASR Track (Read-Only reference overlay mock) */}
        {isReady && wavesurfer.current && (
           <div className="absolute top-0 left-0 w-full h-[20px] pointer-events-none opacity-50 z-0 border-b border-gray-200">
             {/* We can render ASR blocks here if needed based on duration layout, but keeping it simple for now */}
           </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 flex gap-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-teal-500/20 border border-teal-500 rounded-sm"></div>
          <span>Manual SIBI Track (Bisa digeser)</span>
        </div>
      </div>
    </Card>
  );
}
