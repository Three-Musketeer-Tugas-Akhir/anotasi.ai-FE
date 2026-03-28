'use client';

import { useState } from 'react';
import { PenTool } from 'lucide-react';
import { VideoPlayer } from './video-player';
import { TimelineEditor } from './timeline-editor';
import { PropertiesPanel, VideoTrimData } from './properties-panel';
import { ActionBar } from './action-bar';

// Initial Mock Data representing the active Chunk's context
const MOCK_TRIM_DATA: VideoTrimData = {
  start: 0, 
  end: 0, // will be set to video duration dynamically initially
  asrText: 'Nah di situ langsung saya', 
  sibiText: 'NAH DI-SITU LANGSUNG SAYA', 
  alignment: 'nah -> NAH\ndi situ -> DI-SITU\nlangsung -> LANGSUNG\nsaya -> SAYA',
  issue: 'none', 
  comment: ''
};

export function AnnotationPage() {
  const [trimData, setTrimData] = useState<VideoTrimData>(MOCK_TRIM_DATA);
  const [videoUrl, setVideoUrl] = useState('/videos/[FULL] Ricuh Eksekusi Rumah di Kelapa Gading iNews Siang 26 02.mp4_000315.mp4');
  
  // Video State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);

  const handleTrimDataChange = (updates: Partial<VideoTrimData>) => {
    setTrimData(prev => ({ ...prev, ...updates }));
  };

  const handleTrimChange = (start: number, end: number) => {
    setTrimData(prev => ({ ...prev, start, end }));
  };

  const handleAddPrev = () => {
    alert("Simulasi Integrasi Backend: Me-request video N-1 dan menggabungnya (prepend) ke player saat ini...");
  };

  const handleAddNext = () => {
    alert("Simulasi Integrasi Backend: Me-request video N+1 dan menggabungnya (append) ke player saat ini...");
  };

  const handleSave = () => {
    console.log('Saved Final Block:', trimData);
    alert('Anotasi dan perintah pemotongan video (Trim) berhasil disimpan!');
  };

  const handlePreview = () => {
    // Jump to the start of the trim and play
    setCurrentTime(trimData.start);
    setIsPlaying(true);
  };

  const handleFinish = () => {
    if (confirm('Selesaikan anotasi untuk video ini dan lanjutkan ke kalimat ASR berikutnya?')) {
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
            Geser pemotong timeline agar durasi video pas dengan SIBI Sentence. Tambahkan video sebelumnya/selanjutnya jika gerakan terpotong.
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
              onAddPrev={handleAddPrev}
              onAddNext={handleAddNext}
              hasPrev={true}
              hasNext={true}
            />
          </div>
          <div className="flex-[2] min-h-[200px]">
            <TimelineEditor
              videoUrl={videoUrl}
              duration={duration}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTimeUpdate={setCurrentTime}
              trimData={trimData}
              onTrimChange={handleTrimChange}
            />
          </div>
        </div>

        {/* Right Column: Properties Panel */}
        <div className="flex-[1] min-w-[300px] overflow-hidden">
          <PropertiesPanel
            data={trimData}
            onChange={handleTrimDataChange}
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
