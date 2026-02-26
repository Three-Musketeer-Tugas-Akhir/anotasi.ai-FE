'use client';

import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText, Volume2, Clock, CheckCircle2, Video as VideoIcon } from 'lucide-react';
import { useTour } from '@/shared/components/tour';
import { asrReviewTour } from '../asr-review.tour';

// ── Types ──────────────────────────────────────────────────────────

interface Segment {
  id: string;
  startTime: number; // seconds
  endTime: number;
  text: string;
}

interface TxtFile {
  id: string;
  filename: string;
  label: string; // short display label
  segments: Segment[];
}

// ── Mock Data ──────────────────────────────────────────────────────

const VIDEO_TITLE = '[FULL] 29 Korban Kapal Tenggelam Masih Hilang ｜ iNews Siang';
const YOUTUBE_ID = 'wILYlf-_pv8';

const MOCK_TXT_FILES: TxtFile[] = [
  {
    id: 'txt1',
    filename: '0_[FULL] 29 Korban Kapal Tenggelam...iNews Siang_0_faster_whisper_medium_segments.txt',
    label: 'ASR File #1',
    segments: [
      { id: 's1', startTime: 0, endTime: 4, text: 'Didorong-dorong saya dikejar sama beberapa orang.' },
      { id: 's2', startTime: 4, endTime: 6, text: 'Nah, di situ langsung saya dikeroyok, Pak.' },
      { id: 's3', startTime: 6, endTime: 9.5, text: 'Mereka membawa senjata tajam, tongkat, dan batu.' },
      { id: 's4', startTime: 9.5, endTime: 13, text: 'Saya berusaha melarikan diri ke arah gang sempit.' },
      { id: 's5', startTime: 13, endTime: 16.2, text: 'Tetapi dihalang oleh sekelompok pemuda lainnya.' },
      { id: 's6', startTime: 16.2, endTime: 20, text: 'Akhirnya saya terjatuh dan tidak bisa bangkit lagi.' },
      { id: 's7', startTime: 20, endTime: 24.5, text: 'Korban dibawa ke rumah sakit terdekat untuk perawatan.' },
      { id: 's8', startTime: 24.5, endTime: 28, text: 'Polisi langsung mengamankan lokasi kejadian.' },
    ],
  },
  {
    id: 'txt2',
    filename: '0_[FULL] 29 Korban Kapal Tenggelam...iNews Siang_1_faster_whisper_medium_segments.txt',
    label: 'ASR File #2',
    segments: [
      { id: 's9', startTime: 28, endTime: 32, text: 'Saksi mata mengatakan kejadian berlangsung sangat cepat.' },
      { id: 's10', startTime: 32, endTime: 36, text: 'Warga sekitar langsung melaporkan ke pihak kepolisian.' },
      { id: 's11', startTime: 36, endTime: 40.5, text: 'Ambulans tiba di lokasi sekitar sepuluh menit kemudian.' },
      { id: 's12', startTime: 40.5, endTime: 45, text: 'Petugas medis segera melakukan pertolongan pertama.' },
      { id: 's13', startTime: 45, endTime: 49, text: 'Para pelaku berhasil melarikan diri sebelum polisi datang.' },
    ],
  },
  {
    id: 'txt3',
    filename: '0_[FULL] 29 Korban Kapal Tenggelam...iNews Siang_2_faster_whisper_medium_segments.txt',
    label: 'ASR File #3',
    segments: [
      { id: 's14', startTime: 49, endTime: 53, text: 'Kapolres menyatakan akan menyelidiki kasus ini secara tuntas.' },
      { id: 's15', startTime: 53, endTime: 57, text: 'Pihak keluarga korban meminta keadilan dan perlindungan.' },
      { id: 's16', startTime: 57, endTime: 61, text: 'Masyarakat diimbau untuk tetap tenang dan tidak main hakim sendiri.' },
      { id: 's17', startTime: 61, endTime: 65, text: 'Polisi telah menyebar tim untuk mencari para pelaku.' },
      { id: 's18', startTime: 65, endTime: 69, text: 'CCTV di sekitar lokasi sedang diperiksa sebagai barang bukti.' },
      { id: 's19', startTime: 69, endTime: 73, text: 'Kasus ini menjadi perhatian serius aparat keamanan setempat.' },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

// ── Component ──────────────────────────────────────────────────────

export function AsrReviewPage() {
  const [activeFileId, setActiveFileId] = useState(MOCK_TXT_FILES[0].id);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { startTour, activeTour, hasCompletedTour } = useTour();

  const activeFile = MOCK_TXT_FILES.find((f) => f.id === activeFileId) ?? MOCK_TXT_FILES[0];
  const activeSegment = activeFile.segments.find((s) => s.id === activeSegmentId);

  // Tour trigger
  useEffect(() => {
    if (!activeTour && !hasCompletedTour(asrReviewTour.id)) {
      const timer = setTimeout(() => {
        startTour(asrReviewTour);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [activeTour, hasCompletedTour, startTour]);

  const handleSegmentClick = (segment: Segment) => {
    setActiveSegmentId(segment.id);
    if (iframeRef.current) {
      const src = `https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?autoplay=1&start=${Math.floor(segment.startTime)}&rel=0&modestbranding=1`;
      iframeRef.current.src = src;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0 shadow-sm z-10 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Volume2 className="text-teal-600" size={22} />
              Deteksi Suara (ASR) — Review Workspace
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review hasil deteksi suara. Klik segmen untuk melompat ke timestamp video.
            </p>
          </div>
          <div className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 shadow-sm">
            <VideoIcon size={14} />
            {VIDEO_TITLE}
          </div>
        </div>

        {/* Bento file cards */}
        <div id="tour-asr-file-tabs" className="grid grid-cols-3 gap-3">
          {MOCK_TXT_FILES.map((file) => {
            const isActive = file.id === activeFileId;
            return (
              <button
                key={file.id}
                onClick={() => {
                  setActiveFileId(file.id);
                  setActiveSegmentId(null);
                }}
                className={`text-left rounded-xl border p-3.5 transition-all ${
                  isActive
                    ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200 shadow-sm'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${isActive ? 'text-teal-700' : 'text-gray-700'}`}>{file.label}</p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5" title={file.filename}>{file.filename}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${
                    isActive ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-200 text-gray-600 border-gray-300'
                  }`}>
                    {file.segments.length}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </header>

      {/* Split Workspace: segments (main) + video (secondary) */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Segments (the MAIN panel — wider) */}
        <div id="tour-asr-segments" className="flex-1 bg-white flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 flex-shrink-0">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-teal-600" />
              <span className="text-sm font-bold text-slate-700">{activeFile.label}</span>
              <span className="text-xs text-slate-400">— {activeFile.segments.length} segmen</span>
            </div>
            <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-1 rounded flex items-center">
              <CheckCircle2 size={10} className="mr-1" /> READ ONLY
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2.5">
              {activeFile.segments.map((seg, idx) => {
                const isActive = seg.id === activeSegmentId;
                return (
                  <button
                    key={seg.id}
                    onClick={() => handleSegmentClick(seg)}
                    className={`w-full text-left rounded-xl border p-4 transition-all relative overflow-hidden group ${
                      isActive
                        ? 'border-teal-300 bg-teal-50 ring-2 ring-teal-500/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-sm'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500" />}

                    <div className="flex items-center gap-2 mb-2">
                      <div className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center font-semibold ${
                        isActive ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-300 group-hover:border-slate-400'
                      }`}>
                        <Clock size={10} className="mr-1.5 opacity-80" />
                        {formatTime(seg.startTime)} → {formatTime(seg.endTime)}
                      </div>
                      <span className={`text-[10px] font-bold ${isActive ? 'text-teal-500' : 'text-slate-400'}`}>
                        SEGMEN {idx + 1}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${
                      isActive ? 'text-teal-800 font-semibold' : 'text-slate-700 font-medium'
                    }`}>
                      {seg.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Video Player (secondary — narrower) */}
        <div id="tour-asr-video" className="w-[420px] flex-shrink-0 border-l border-slate-200 bg-slate-900 flex flex-col">
          {/* Video iframe */}
          <div className="aspect-video relative flex-shrink-0">
            <iframe
              ref={iframeRef}
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?autoplay=0&rel=0&modestbranding=1`}
              title="ASR Review Video"
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Subtitle display */}
          <div className="flex-1 bg-slate-900/95 backdrop-blur-md px-5 py-4 border-t border-slate-800 flex flex-col justify-center">
            {activeSegment ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                    {formatTime(activeSegment.startTime)} → {formatTime(activeSegment.endTime)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium bg-slate-800 px-2 py-0.5 rounded-md">Segmen Aktif</span>
                </div>
                <p className="text-white/95 text-base font-medium leading-relaxed">
                  &ldquo;{activeSegment.text}&rdquo;
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 text-center">
                <Volume2 size={20} className="mb-2 opacity-50" />
                <p className="text-xs font-medium">Klik segmen di panel kiri</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Video akan meloncat ke timestamp</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
