'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Cog,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  Film,
  Scissors,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowDown,
  ExternalLink,
  X,
  Volume2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

type StageStatus = 'pending' | 'processing' | 'done' | 'failed';

interface VideoChunk {
  id: string;
  filename: string;
  label: string; // short display name e.g. "Chunk 01"
  duration: string;
}

interface AsrFile {
  id: string;
  chunkId: string;
  filename: string;
  label: string; // short display name e.g. "ASR File #1"
  segmentCount: number;
}

interface MicroClip {
  id: string;
  segmentId: string;
  word: string;
  filename: string;
}

interface PipelineVideo {
  id: string;
  filename: string;
  source: string;
  duration: string;
  stages: {
    cv1: { status: StageStatus; progress: number };
    asr: { status: StageStatus; progress: number };
    cv2: { status: StageStatus; progress: number };
  };
  cv1Chunks: VideoChunk[];
  asrFiles: AsrFile[];
  microClips: MicroClip[];
  errorMsg?: string;
}

// ── Mock Data ──────────────────────────────────────────────────────

const MOCK_PIPELINE: PipelineVideo[] = [
  {
    id: 'pv1',
    filename: '0_[FULL] 29 Korban Kapal Tenggelam.mp4',
    source: 'iNews',
    duration: '1:26:53',
    stages: {
      cv1: { status: 'done', progress: 100 },
      asr: { status: 'processing', progress: 65 },
      cv2: { status: 'pending', progress: 0 },
    },
    cv1Chunks: [
      { id: 'c1-1', filename: '0_[FULL] 29 Korban Kapal Tenggelam...iNews Siang_000057.mp4', label: 'Chunk 01', duration: '00:04:12' },
      { id: 'c1-2', filename: '0_[FULL] 29 Korban Kapal Tenggelam...iNews Siang_000134.mp4', label: 'Chunk 02', duration: '00:03:48' },
      { id: 'c1-3', filename: '0_[FULL] 29 Korban Kapal Tenggelam...iNews Siang_000912.mp4', label: 'Chunk 03', duration: '00:05:01' },
    ],
    asrFiles: [
      { id: 'af1-1', chunkId: 'c1-1', filename: '0_[FULL] 29 Korban Kapal...iNews_0_faster_whisper_medium_segments.txt', label: 'ASR File #1', segmentCount: 8 },
      { id: 'af1-2', chunkId: 'c1-2', filename: '0_[FULL] 29 Korban Kapal...iNews_1_faster_whisper_medium_segments.txt', label: 'ASR File #2', segmentCount: 6 },
    ],
    microClips: [],
  },
  {
    id: 'pv2',
    filename: 'Sidang Kabinet Paripurna.mp4',
    source: 'TVRI',
    duration: '08:45',
    stages: {
      cv1: { status: 'done', progress: 100 },
      asr: { status: 'done', progress: 100 },
      cv2: { status: 'done', progress: 100 },
    },
    cv1Chunks: [
      { id: 'c2-1', filename: 'Sidang Kabinet Paripurna_000042.mp4', label: 'Chunk 01', duration: '00:02:50' },
      { id: 'c2-2', filename: 'Sidang Kabinet Paripurna_000215.mp4', label: 'Chunk 02', duration: '00:03:15' },
      { id: 'c2-3', filename: 'Sidang Kabinet Paripurna_000530.mp4', label: 'Chunk 03', duration: '00:02:40' },
    ],
    asrFiles: [
      { id: 'af2-1', chunkId: 'c2-1', filename: 'Sidang Kabinet Paripurna_0_faster_whisper_medium_segments.txt', label: 'ASR File #1', segmentCount: 8 },
      { id: 'af2-2', chunkId: 'c2-2', filename: 'Sidang Kabinet Paripurna_1_faster_whisper_medium_segments.txt', label: 'ASR File #2', segmentCount: 5 },
      { id: 'af2-3', chunkId: 'c2-3', filename: 'Sidang Kabinet Paripurna_2_faster_whisper_medium_segments.txt', label: 'ASR File #3', segmentCount: 6 },
    ],
    microClips: [
      { id: 'm2-1', segmentId: 'a2-1', word: 'PRESIDEN', filename: 'micro_001.mp4' },
      { id: 'm2-2', segmentId: 'a2-1', word: 'BUKA', filename: 'micro_002.mp4' },
      { id: 'm2-3', segmentId: 'a2-1', word: 'SIDANG', filename: 'micro_003.mp4' },
      { id: 'm2-4', segmentId: 'a2-2', word: 'MENTERI', filename: 'micro_004.mp4' },
      { id: 'm2-5', segmentId: 'a2-2', word: 'KEUANGAN', filename: 'micro_005.mp4' },
    ],
  },
  {
    id: 'pv3',
    filename: 'Breaking News Gempa.mp4',
    source: 'TVOne',
    duration: '15:30',
    stages: {
      cv1: { status: 'failed', progress: 34 },
      asr: { status: 'pending', progress: 0 },
      cv2: { status: 'pending', progress: 0 },
    },
    cv1Chunks: [],
    asrFiles: [],
    microClips: [],
    errorMsg: 'OpenCV: frame extraction timeout setelah 120s',
  },
  {
    id: 'pv4',
    filename: 'Berita Utama Siang.mp4',
    source: 'TVRI',
    duration: '06:12',
    stages: {
      cv1: { status: 'done', progress: 100 },
      asr: { status: 'done', progress: 100 },
      cv2: { status: 'pending', progress: 0 },
    },
    cv1Chunks: [
      { id: 'c4-1', filename: 'Berita Utama Siang_000028.mp4', label: 'Chunk 01', duration: '00:03:10' },
      { id: 'c4-2', filename: 'Berita Utama Siang_000220.mp4', label: 'Chunk 02', duration: '00:03:02' },
    ],
    asrFiles: [
      { id: 'af4-1', chunkId: 'c4-1', filename: 'Berita Utama Siang_0_faster_whisper_medium_segments.txt', label: 'ASR File #1', segmentCount: 7 },
      { id: 'af4-2', chunkId: 'c4-2', filename: 'Berita Utama Siang_1_faster_whisper_medium_segments.txt', label: 'ASR File #2', segmentCount: 4 },
    ],
    microClips: [],
  },
  {
    id: 'pv5',
    filename: 'Konferensi Pers Polri.mp4',
    source: 'TVRI',
    duration: '05:33',
    stages: {
      cv1: { status: 'pending', progress: 0 },
      asr: { status: 'pending', progress: 0 },
      cv2: { status: 'pending', progress: 0 },
    },
    cv1Chunks: [],
    asrFiles: [],
    microClips: [],
  },
];

// ── Status helpers ──────────────────────────────────────────────────

const stageStatusConfig: Record<StageStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Menunggu', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: <Clock size={12} /> },
  processing: { label: 'Berjalan', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Loader2 size={12} className="animate-spin" /> },
  done: { label: 'Selesai', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  failed: { label: 'Gagal', color: 'bg-red-50 text-red-700 border-red-200', icon: <AlertTriangle size={12} /> },
};

function getOverallStatus(v: PipelineVideo): { label: string; color: string } {
  if (v.stages.cv1.status === 'failed' || v.stages.asr.status === 'failed' || v.stages.cv2.status === 'failed') {
    return { label: 'Error', color: 'bg-red-500' };
  }
  if (v.stages.cv2.status === 'done') return { label: 'Siap Anotasi', color: 'bg-emerald-500' };
  if (v.stages.asr.status === 'done') return { label: 'ASR Selesai', color: 'bg-blue-500' };
  if (v.stages.cv1.status === 'done') return { label: 'CV-1 Selesai', color: 'bg-indigo-500' };
  if (v.stages.cv1.status === 'processing' || v.stages.asr.status === 'processing' || v.stages.cv2.status === 'processing') {
    return { label: 'Processing', color: 'bg-amber-500' };
  }
  return { label: 'Antrian', color: 'bg-gray-400' };
}

function getOverallProgress(v: PipelineVideo): number {
  return Math.round((v.stages.cv1.progress + v.stages.asr.progress + v.stages.cv2.progress) / 3);
}

// ── Main Component ──────────────────────────────────────────────────

export function PipelinePage() {
  const [videos] = useState<PipelineVideo[]>(MOCK_PIPELINE);
  const [selectedId, setSelectedId] = useState<string>(videos[0].id);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    cv1: true,
    asr: true,
    cv2: true,
  });
  const [previewChunkId, setPreviewChunkId] = useState<string | null>(null);

  const selectedVideo = videos.find((v) => v.id === selectedId) ?? videos[0];
  const previewChunk = previewChunkId
    ? selectedVideo.cv1Chunks.find((c) => c.id === previewChunkId) ?? null
    : null;

  const toggleStage = (stage: string) => {
    setExpandedStages((prev) => ({ ...prev, [stage]: !prev[stage] }));
  };

  // Reset preview when switching video
  const handleSelectVideo = (id: string) => {
    setSelectedId(id);
    setPreviewChunkId(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Cog size={22} className="text-teal-600" />
              Pipeline Control & Monitoring
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Pantau progres dan telusuri output setiap tahap pemrosesan video
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <Loader2 size={10} className="animate-spin mr-1" />
              {videos.filter((v) => v.stages.cv1.status === 'processing' || v.stages.asr.status === 'processing' || v.stages.cv2.status === 'processing').length} Sedang Diproses
            </Badge>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 size={10} className="mr-1" />
              {videos.filter((v) => v.stages.cv2.status === 'done').length} Siap Anotasi
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ──── Left: Video List ──── */}
        <div className="w-80 min-w-[320px] bg-white border-r border-gray-200 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Video dalam Pipeline ({videos.length})</p>
          </div>
          <ScrollArea className="flex-1">
            {videos.map((v) => {
              const overall = getOverallStatus(v);
              const progress = getOverallProgress(v);
              const isSelected = v.id === selectedId;
              return (
                <button
                  key={v.id}
                  onClick={() => handleSelectVideo(v.id)}
                  className={`block w-full text-left px-4 py-3.5 border-b border-gray-100 transition-all ${
                    isSelected
                      ? 'bg-teal-50 border-l-[3px] border-l-teal-500'
                      : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${overall.color} flex-shrink-0`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-teal-800' : 'text-gray-800'}`}>
                        {v.filename}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400">{v.source}</span>
                        <span className="text-[10px] text-gray-300">•</span>
                        <span className="text-[10px] text-gray-400">{v.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={progress} className="flex-1 h-1.5" />
                        <span className="text-[10px] font-mono text-gray-400">{progress}%</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        </div>

        {/* ──── Right: Pipeline Tree Explorer ──── */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* Source Video Header */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <Video size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Video Sumber</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">{selectedVideo.filename}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-gray-500">Sumber: {selectedVideo.source}</span>
                    <span className="text-xs text-gray-500">Durasi: {selectedVideo.duration}</span>
                  </div>
                </div>
              </div>
              {selectedVideo.stages.cv1.status === 'pending' && (
                <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Play size={14} className="mr-1.5" /> Mulai Pipeline
                </Button>
              )}
              {selectedVideo.stages.cv1.status === 'failed' && (
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                  <RotateCcw size={14} className="mr-1.5" /> Retry
                </Button>
              )}
            </div>
            {selectedVideo.errorMsg && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{selectedVideo.errorMsg}</span>
              </div>
            )}
          </div>

          {/* ──── Stage: CV-1 ──── */}
          <StageConnector />
          <StageSection
            title="CV-1: Deteksi & Ekstraksi Chunk"
            subtitle="Computer Vision memotong video menjadi segmen berisi JBI"
            icon={<Scissors size={18} />}
            status={selectedVideo.stages.cv1.status}
            progress={selectedVideo.stages.cv1.progress}
            expanded={!!expandedStages.cv1}
            onToggle={() => toggleStage('cv1')}
            outputCount={selectedVideo.cv1Chunks.length}
            outputLabel="video chunk"
          >
            {selectedVideo.cv1Chunks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                {selectedVideo.cv1Chunks.map((chunk) => (
                  <button
                    key={chunk.id}
                    onClick={() => setPreviewChunkId(previewChunkId === chunk.id ? null : chunk.id)}
                    className="group text-left w-full"
                  >
                    <div className={`border rounded-lg p-3.5 transition-all cursor-pointer group-hover:shadow-md ${
                      previewChunkId === chunk.id
                        ? 'bg-teal-50 border-teal-400 ring-1 ring-teal-200'
                        : 'bg-gray-50 hover:bg-teal-50 border-gray-200 hover:border-teal-300'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <Film size={18} className="text-teal-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${previewChunkId === chunk.id ? 'text-teal-700' : 'text-gray-800 group-hover:text-teal-700'}`}>{chunk.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate" title={chunk.filename}>{chunk.filename}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Durasi: {chunk.duration}</p>
                        </div>
                        <Play size={14} className={`flex-shrink-0 ${previewChunkId === chunk.id ? 'text-teal-500' : 'text-gray-300 group-hover:text-teal-500'}`} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {/* ── Inline CV Preview Panel ── */}
            {previewChunk && (
              <div className="mt-4 bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
                  <div className="flex items-center gap-2">
                    <Film size={14} className="text-teal-400" />
                    <span className="text-sm font-semibold text-white">{previewChunk.label}</span>
                    <span className="text-xs text-slate-400 ml-2">Durasi: {previewChunk.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="/asr-review"
                      className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 bg-slate-700 px-2.5 py-1 rounded-md hover:bg-slate-600 transition-colors"
                    >
                      <ExternalLink size={10} /> Buka di Deteksi Suara
                    </a>
                    <button onClick={() => setPreviewChunkId(null)} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {/* Video placeholder */}
                <div className="aspect-video flex items-center justify-center bg-slate-900 relative">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                      <Play size={28} className="text-white/80 ml-1" />
                    </div>
                    <p className="text-white/50 text-sm">Video Chunk Preview</p>
                    <p className="text-white/30 text-xs mt-1">{previewChunk.filename}</p>
                  </div>
                </div>
                {/* Waveform placeholder */}
                <div className="h-12 bg-slate-800 border-t border-slate-700 flex items-center px-4 gap-3">
                  <Volume2 size={14} className="text-slate-400" />
                  <div className="flex-1 flex items-center gap-[2px] h-6">
                    {Array.from({ length: 60 }).map((_, i) => {
                      const h = ((i * 7 + 13) * 17 % 100) + 5;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-teal-500/50 rounded-full"
                          style={{ height: `${h}%`, minHeight: '2px' }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </StageSection>

          {/* ──── Stage: ASR ──── */}
          <StageConnector />
          <StageSection
            title="ASR: Transkripsi Otomatis"
            subtitle="Speech Recognition mengubah audio menjadi teks"
            icon={<FileText size={18} />}
            status={selectedVideo.stages.asr.status}
            progress={selectedVideo.stages.asr.progress}
            expanded={!!expandedStages.asr}
            onToggle={() => toggleStage('asr')}
            outputCount={selectedVideo.asrFiles.length}
            outputLabel="file .txt"
          >
            {selectedVideo.asrFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                {selectedVideo.asrFiles.map((file) => (
                  <a key={file.id} href="/asr-review" className="group">
                    <div className="bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg p-3.5 transition-all cursor-pointer group-hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <FileText size={18} className="text-indigo-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-indigo-700">{file.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate" title={file.filename}>{file.filename}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{file.segmentCount} segmen terdeteksi</p>
                        </div>
                        <ExternalLink size={14} className="text-gray-300 group-hover:text-indigo-500 flex-shrink-0" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </StageSection>

          {/* ──── Stage: CV-2 ──── */}
          <StageConnector />
          <StageSection
            title="CV-2: Ekstraksi Micro-Clip per Kata"
            subtitle="Memotong video menjadi clip pendek untuk setiap tanda isyarat"
            icon={<Film size={18} />}
            status={selectedVideo.stages.cv2.status}
            progress={selectedVideo.stages.cv2.progress}
            expanded={!!expandedStages.cv2}
            onToggle={() => toggleStage('cv2')}
            outputCount={selectedVideo.microClips.length}
            outputLabel="micro-clip"
          >
            {selectedVideo.microClips.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 mt-3">
                {selectedVideo.microClips.map((clip) => (
                  <a key={clip.id} href="/annotation" className="group">
                    <div className="bg-gray-50 hover:bg-teal-50 border border-gray-200 hover:border-teal-300 rounded-lg p-3 transition-all cursor-pointer text-center group-hover:shadow-md">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mx-auto mb-2">
                        <Film size={14} className="text-amber-700" />
                      </div>
                      <p className="text-xs font-bold text-gray-800 group-hover:text-teal-700 uppercase tracking-wide">{clip.word}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{clip.filename}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </StageSection>

          {/* Final: Ready for annotation */}
          {selectedVideo.stages.cv2.status === 'done' && (
            <>
              <StageConnector />
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5 text-center">
                <CheckCircle2 size={32} className="text-emerald-600 mx-auto mb-2" />
                <p className="text-base font-bold text-emerald-800">Siap untuk Anotasi!</p>
                <p className="text-sm text-emerald-600 mt-1">Semua tahap pemrosesan selesai. Video siap dianotasi.</p>
                <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                  <a href="/annotation">
                    <ExternalLink size={14} className="mr-1.5" /> Buka Annotation Workspace
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-Components ──────────────────────────────────────────────────

function StageConnector() {
  return (
    <div className="flex justify-center py-1">
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-4 bg-gray-300" />
        <ArrowDown size={14} className="text-gray-400 -mt-1" />
      </div>
    </div>
  );
}

function StageSection({
  title,
  subtitle,
  icon,
  status,
  progress,
  expanded,
  onToggle,
  outputCount,
  outputLabel,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  status: StageStatus;
  progress: number;
  expanded: boolean;
  onToggle: () => void;
  outputCount: number;
  outputLabel: string;
  children?: React.ReactNode;
}) {
  const sc = stageStatusConfig[status];
  const hasOutput = outputCount > 0;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
      status === 'failed' ? 'border-red-200' : status === 'processing' ? 'border-amber-200' : 'border-gray-200'
    }`}>
      {/* Stage Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          status === 'done' ? 'bg-emerald-100 text-emerald-600' :
          status === 'processing' ? 'bg-amber-100 text-amber-600' :
          status === 'failed' ? 'bg-red-100 text-red-600' :
          'bg-gray-100 text-gray-400'
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-800">{title}</p>
            <Badge variant="outline" className={`text-[10px] ${sc.color}`}>
              {sc.icon} <span className="ml-1">{sc.label}</span>
            </Badge>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        {status === 'processing' && (
          <div className="flex items-center gap-2 w-32">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-xs font-mono text-gray-500">{progress}%</span>
          </div>
        )}
        {hasOutput && (
          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs mr-2">
            {outputCount} {outputLabel}
          </Badge>
        )}
        <div className="text-gray-400 flex-shrink-0">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {/* Expanded Content: Output Cards */}
      {expanded && hasOutput && (
        <div className="px-5 pb-4 border-t border-gray-100">
          {children}
        </div>
      )}

      {/* Processing action */}
      {status === 'pending' && expanded && (
        <div className="px-5 pb-4 border-t border-gray-100">
          <div className="flex items-center justify-center py-6 text-gray-400">
            <Clock size={16} className="mr-2" />
            <span className="text-sm">Menunggu tahap sebelumnya selesai...</span>
          </div>
        </div>
      )}

      {/* Failed state with retry */}
      {status === 'failed' && expanded && (
        <div className="px-5 pb-4 border-t border-red-100">
          <div className="flex items-center justify-center py-4 gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                  <RotateCcw size={14} className="mr-1.5" /> Retry Tahap Ini
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Jalankan ulang tahap ini</p></TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
