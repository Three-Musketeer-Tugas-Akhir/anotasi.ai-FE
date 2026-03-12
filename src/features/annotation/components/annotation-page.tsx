'use client';

import { useState, useCallback } from 'react';
import { PenTool } from 'lucide-react';
import { VideoPlayer } from './video-player';
import { TimelineEditor } from './timeline-editor';
import { PropertiesPanel, AnnotationData } from './properties-panel';
import { ActionBar } from './action-bar';

// Initial Mock Data
const MOCK_ANNOTATIONS: AnnotationData[] = [
  { id: '1', start: 0.5, end: 4.0, asrText: 'Nah di situ langsung saya', sibiText: 'NAH DI-SITU LANGSUNG SAYA', issue: 'none', comment: '' },
  { id: '2', start: 4.5, end: 8.0, asrText: 'dikeroyok pak', sibiText: 'DI-KEROYOK PAK', issue: 'none', comment: '' },
];

export function AnnotationPage() {
  const [annotations, setAnnotations] = useState<AnnotationData[]>(MOCK_ANNOTATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Video State
  const [videoUrl] = useState('/videos/[FULL] Ricuh Eksekusi Rumah di Kelapa Gading iNews Siang 26 02.mp4_000315.mp4');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);

  const selectedAnnotation = annotations.find(a => a.id === selectedId) || null;

  const handleAnnotationChange = useCallback((id: string, updates: Partial<AnnotationData>) => {
    setAnnotations(prev => prev.map(ann => ann.id === id ? { ...ann, ...updates } : ann));
  }, []);

  const handleSave = () => {
    console.log('Saved Annotations:', annotations);
    alert('Anotasi berhasil disimpan!');
  };

  const handlePreview = () => {
    setIsPlaying(true);
  };

  const handleFinish = () => {
    if (confirm('Selesaikan anotasi untuk video ini?')) {
      alert('Selesai!');
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 bg-gray-50 h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PenTool size={20} className="text-teal-600" />
            Workspace Anotasi
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Sesuaikan blok anotasi pada timeline dengan gerakan video.
          </p>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden mb-4">
        {/* Left Column: Video & Timeline */}
        <div className="flex-[2] flex flex-col gap-4 min-w-0">
          <div className="flex-[3] min-h-0">
            <VideoPlayer
              src={videoUrl}
              isPlaying={isPlaying}
              onPlayPause={setIsPlaying}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              playbackRate={playbackRate}
              onPlaybackRateChange={setPlaybackRate}
              onDurationChange={setDuration}
            />
          </div>
          <div className="flex-[2] min-h-[200px]">
            <TimelineEditor
              videoUrl={videoUrl}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTimeUpdate={setCurrentTime}
              annotations={annotations}
              selectedId={selectedId}
              onSelectAnnotation={setSelectedId}
              onAnnotationChange={handleAnnotationChange}
            />
          </div>
        </div>

        {/* Right Column: Properties Panel */}
        <div className="flex-[1] min-w-[300px] overflow-hidden">
          <PropertiesPanel
            selectedAnnotation={selectedAnnotation}
            onChange={handleAnnotationChange}
          />
        </div>
      </div>

      {/* Footer / Action Bar */}
      <div className="flex-shrink-0">
        <ActionBar
          onSave={handleSave}
          onPreview={handlePreview}
          onFinish={handleFinish}
        />
      </div>
    </div>
  );
}
