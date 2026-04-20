'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Shield,
  Play,
  Pause,
  Square,
  FileText,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { env } from '@/core/config/env';
import { pipelineApi } from '@/features/pipeline/pipeline-api';
import type {
  Stage2ResultsResponse,
  Stage2SegmentResult,
  Stage2Utterance,
} from '@/features/pipeline/types';

// ── Helpers ────────────────────────────────────────────────────────

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getConfidenceBadge(score: number): { color: string; label: string } {
  if (score >= 0.9) return { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Tinggi' };
  if (score >= 0.7) return { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Sedang' };
  return { color: 'bg-red-50 text-red-700 border-red-200', label: 'Rendah' };
}

function buildAudioUrl(jobId: string, segmentId: string): string {
  return `${env.API_URL}/assets/jobs/${jobId}/audio/${segmentId}.wav`;
}

// Utterance colors for the timeline regions
const UTT_COLORS = [
  'rgba(20, 184, 166, 0.3)',  // teal
  'rgba(59, 130, 246, 0.3)',  // blue
  'rgba(168, 85, 247, 0.3)',  // purple
  'rgba(249, 115, 22, 0.3)',  // orange
  'rgba(236, 72, 153, 0.3)',  // pink
  'rgba(34, 197, 94, 0.3)',   // green
];

const UTT_COLORS_ACTIVE = [
  'rgba(20, 184, 166, 0.55)',
  'rgba(59, 130, 246, 0.55)',
  'rgba(168, 85, 247, 0.55)',
  'rgba(249, 115, 22, 0.55)',
  'rgba(236, 72, 153, 0.55)',
  'rgba(34, 197, 94, 0.55)',
];

// ── Waveform Timeline ──────────────────────────────────────────────

function WaveformTimeline({
  audioUrl,
  utterances,
  currentTime,
  duration,
  playingUttIdx,
  hoveredUttIdx,
  onSeek,
  onHoverUtt,
}: {
  audioUrl: string;
  utterances: Stage2Utterance[];
  currentTime: number;
  duration: number;
  playingUttIdx: number | null;
  hoveredUttIdx: number | null;
  onSeek: (time: number) => void;
  onHoverUtt: (idx: number | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Decode WAV into waveform data
  useEffect(() => {
    setIsLoading(true);
    setWaveformData(null);

    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    fetch(audioUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => audioCtx.decodeAudioData(buf))
      .then((decoded) => {
        const rawData = decoded.getChannelData(0);
        // Downsample to ~800 points for performance
        const samples = 800;
        const blockSize = Math.floor(rawData.length / samples);
        const filtered = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          const start = i * blockSize;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[start + j] || 0);
          }
          filtered[i] = sum / blockSize;
        }
        // Normalize
        const max = Math.max(...filtered) || 1;
        for (let i = 0; i < filtered.length; i++) {
          filtered[i] = filtered[i] / max;
        }
        setWaveformData(filtered);
        setIsLoading(false);
      })
      .catch(() => {
        // If decode fails, generate placeholder waveform
        const samples = 800;
        const placeholder = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          placeholder[i] = 0.1 + Math.random() * 0.5;
        }
        setWaveformData(placeholder);
        setIsLoading(false);
      });

    return () => { audioCtx.close(); };
  }, [audioUrl]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !waveformData) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const timelineH = h - 20; // Reserve 20px for time axis
    const totalDur = duration || 1;

    // Background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, w, h);

    // Draw utterance regions
    utterances.forEach((utt, idx) => {
      const x1 = (utt.start / totalDur) * w;
      const x2 = (utt.end / totalDur) * w;
      const isActive = idx === playingUttIdx;
      const isHovered = idx === hoveredUttIdx;
      const colorArr = (isActive || isHovered) ? UTT_COLORS_ACTIVE : UTT_COLORS;
      ctx.fillStyle = colorArr[idx % colorArr.length];
      ctx.fillRect(x1, 0, x2 - x1, timelineH);

      // Utterance label
      if (x2 - x1 > 20) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${idx + 1}`, (x1 + x2) / 2, 10);
      }
    });

    // Draw waveform bars
    const barW = Math.max(1, (w / waveformData.length) - 0.5);
    for (let i = 0; i < waveformData.length; i++) {
      const x = (i / waveformData.length) * w;
      const amplitude = waveformData[i];
      const barH = amplitude * (timelineH - 8);
      const y = (timelineH / 2) - (barH / 2);

      // Determine bar color based on which utterance it falls in
      const timeAtBar = (i / waveformData.length) * totalDur;
      const uttIdx = utterances.findIndex((u) => timeAtBar >= u.start && timeAtBar <= u.end);
      if (uttIdx >= 0) {
        const isActive = uttIdx === playingUttIdx || uttIdx === hoveredUttIdx;
        ctx.fillStyle = isActive ? 'rgba(20, 184, 166, 0.95)' : 'rgba(20, 184, 166, 0.7)';
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)'; // slate-400
      }
      ctx.fillRect(x, y + 4, barW, barH);
    }

    // Time axis
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.fillRect(0, timelineH, w, 20);

    // Time markers
    const step = totalDur > 120 ? 30 : totalDur > 30 ? 10 : 5;
    for (let t = 0; t <= totalDur; t += step) {
      const x = (t / totalDur) * w;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.fillRect(x, timelineH, 1, 4);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatTimeShort(t), x, timelineH + 14);
    }

    // Playhead
    if (currentTime > 0 && currentTime <= totalDur) {
      const px = (currentTime / totalDur) * w;
      ctx.fillStyle = '#ef4444'; // red-500
      ctx.fillRect(px - 1, 0, 2, timelineH);
      // Playhead triangle
      ctx.beginPath();
      ctx.moveTo(px - 5, 0);
      ctx.lineTo(px + 5, 0);
      ctx.lineTo(px, 6);
      ctx.closePath();
      ctx.fill();
    }
  }, [waveformData, currentTime, duration, utterances, playingUttIdx, hoveredUttIdx]);

  // Handle click to seek
  const handleClick = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    onSeek(Math.max(0, Math.min(time, duration)));
  };

  // Handle mouse move for hover detection
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    const uttIdx = utterances.findIndex((u) => time >= u.start && time <= u.end);
    onHoverUtt(uttIdx >= 0 ? uttIdx : null);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[88px] rounded-lg overflow-hidden cursor-crosshair"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHoverUtt(null)}
    >
      {isLoading ? (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
          <Loader2 size={16} className="text-teal-500 animate-spin" />
          <span className="text-[10px] text-slate-400 ml-2">Memuat waveform...</span>
        </div>
      ) : (
        <canvas ref={canvasRef} className="absolute inset-0" />
      )}
    </div>
  );
}

// ── Job Picker ─────────────────────────────────────────────────────

function JobPicker({ onSelectJob }: { onSelectJob: (jobId: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<{ id: string; status: string; total_segments: number; created_at: string | null }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await pipelineApi.listJobs({ status: 'READY_FOR_ANNOTATION', page: 1, page_size: 50 });
        setJobs(data.items);
      } catch {
        setError('Gagal memuat daftar job');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle size={28} className="text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-12 text-center">
        <FileText size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">Belum ada job yang selesai diproses</p>
        <p className="text-xs text-gray-400 mt-1">Upload dan proses video terlebih dahulu di halaman Pipeline</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="text-center mb-6">
        <Layers size={32} className="text-teal-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-gray-800">Pilih Job untuk Review ASR</h2>
        <p className="text-sm text-gray-500 mt-1">Pilih salah satu video yang sudah selesai diproses</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {jobs.map((job) => (
          <button
            key={job.id}
            onClick={() => onSelectJob(job.id)}
            className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-teal-300 hover:bg-teal-50/30 hover:shadow-sm transition-all group"
          >
            <p className="text-sm font-bold text-gray-800 font-mono group-hover:text-teal-700 transition-colors">
              Job #{job.id.slice(0, 8)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 size={8} className="mr-0.5" /> Selesai
              </Badge>
              <span className="text-[10px] text-gray-400">{job.total_segments} segmen</span>
            </div>
            {job.created_at && (
              <p className="text-[10px] text-gray-400 mt-1.5">
                {new Date(job.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Expandable Text Component ──────────────────────────────────────

function ExpandableText({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const checkTruncation = () => {
      // If we are not expanded, we can check if scrollHeight > clientHeight
      // to determine if it's truncated by the line clamp.
      if (!isExpanded) {
        setIsTruncated(el.scrollHeight > el.clientHeight);
      }
    };

    checkTruncation();

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(el);

    return () => observer.disconnect();
  }, [text, isExpanded]);

  return (
    <div className="flex flex-col items-start w-full">
      <div
        ref={textRef}
        className={`text-sm text-gray-800 leading-relaxed overflow-hidden text-wrap break-words w-full ${
          !isExpanded ? 'line-clamp-2' : ''
        }`}
        style={{
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
      {(isTruncated || isExpanded) && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[10px] text-teal-600 hover:text-teal-800 font-medium mt-1 transition-colors"
        >
          {isExpanded ? 'Sembunyikan' : 'Tampilkan selengkapnya...'}
        </button>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function AsrReviewPage() {
  const searchParams = useSearchParams();
  const urlJobId = searchParams.get('job_id');

  const [selectedJobId, setSelectedJobId] = useState<string | null>(urlJobId);
  const [stage2Data, setStage2Data] = useState<Stage2ResultsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);

  // Audio playback state (shared across all utterances)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const [playingUttIdx, setPlayingUttIdx] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [hoveredUttIdx, setHoveredUttIdx] = useState<number | null>(null);

  // Table pagination & expand state
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 20;

  // Sync URL param
  useEffect(() => {
    if (urlJobId && urlJobId !== selectedJobId) {
      setSelectedJobId(urlJobId);
    }
  }, [urlJobId]);

  // Fetch stage2 data when job is selected
  const fetchStage2 = useCallback(async (jobId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await pipelineApi.getStage2Results(jobId);
      setStage2Data(data);
      setActiveSegmentIdx(0);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Gagal memuat hasil ASR';
      setError(typeof msg === 'string' ? msg : 'Gagal memuat hasil ASR');
      setStage2Data(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchStage2(selectedJobId);
    }
  }, [selectedJobId, fetchStage2]);

  // Reset playback + table state when segment changes
  useEffect(() => {
    stopPlayback();
    setCurrentTime(0);
    setAudioDuration(0);
    setTablePage(1);
  }, [activeSegmentIdx]);

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    window.history.replaceState(null, '', `/asr-review?job_id=${jobId}`);
  };

  // ── Audio Control (single shared player) ──

  const segments = stage2Data?.results ?? [];
  const activeSegment = segments[activeSegmentIdx] ?? null;
  const audioUrl = selectedJobId && activeSegment
    ? buildAudioUrl(selectedJobId, activeSegment.segment_id)
    : '';

  // Create/update audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onMeta = () => setAudioDuration(audio.duration);
    const onEnd = () => {
      setPlayingUttIdx(null);
      cancelAnimationFrame(rafRef.current);
    };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      cancelAnimationFrame(rafRef.current);
      audioRef.current = null;
    };
  }, [audioUrl]);

  const startTimeTracking = useCallback(() => {
    const track = () => {
      const audio = audioRef.current;
      if (!audio) return;
      setCurrentTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(track);
    };
    rafRef.current = requestAnimationFrame(track);
  }, []);

  const playUtterance = useCallback((uttIdx: number) => {
    const audio = audioRef.current;
    if (!audio || !activeSegment) return;

    const utt = activeSegment.utterances[uttIdx];
    if (!utt) return;

    // Stop any current playback
    audio.pause();
    cancelAnimationFrame(rafRef.current);

    // Seek and play
    audio.currentTime = utt.start;
    audio.play().catch(() => {});
    setPlayingUttIdx(uttIdx);
    setCurrentTime(utt.start);

    // Track time and stop at end
    const trackAndLimit = () => {
      if (!audioRef.current) return;
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.currentTime >= utt.end) {
        audioRef.current.pause();
        setPlayingUttIdx(null);
        return;
      }
      rafRef.current = requestAnimationFrame(trackAndLimit);
    };
    rafRef.current = requestAnimationFrame(trackAndLimit);
  }, [activeSegment]);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    cancelAnimationFrame(rafRef.current);
    setPlayingUttIdx(null);
  }, []);

  const handleSeek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !activeSegment) return;

    audio.currentTime = time;
    setCurrentTime(time);

    // Find which utterance this falls in
    const uttIdx = activeSegment.utterances.findIndex((u) => time >= u.start && time <= u.end);
    if (uttIdx >= 0) {
      playUtterance(uttIdx);
    }
  }, [activeSegment, playUtterance]);

  // Compute total duration from utterances (fallback if audio not loaded)
  const totalDuration = useMemo(() => {
    if (audioDuration > 0) return audioDuration;
    if (!activeSegment) return 0;
    const maxEnd = Math.max(...activeSegment.utterances.map((u) => u.end), 0);
    return maxEnd + 1;
  }, [audioDuration, activeSegment]);

  // ── No job selected → show picker ──
  if (!selectedJobId) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Volume2 size={22} className="text-teal-600" />
            ASR Review
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review hasil transkripsi otomatis (Whisper ASR) per video
          </p>
        </header>
        <ScrollArea className="flex-1">
          <JobPicker onSelectJob={handleJobSelect} />
        </ScrollArea>
      </div>
    );
  }

  // ── Job selected → show ASR results ──
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Volume2 size={22} className="text-teal-600" />
              ASR Review
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Job <span className="font-mono text-gray-700">{selectedJobId.slice(0, 8)}...</span> — Hasil transkripsi Whisper ASR
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                stopPlayback();
                setSelectedJobId(null);
                window.history.replaceState(null, '', '/asr-review');
              }}
            >
              <ChevronLeft size={14} className="mr-1" />
              Pilih Job Lain
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => fetchStage2(selectedJobId)}
            >
              <RefreshCw size={14} className="mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 flex-1">
          <Loader2 size={24} className="text-teal-600 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
          <AlertTriangle size={28} className="text-red-400 mb-2" />
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchStage2(selectedJobId)}>Coba Lagi</Button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && stage2Data && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Segment Tabs */}
          <div className="bg-white border-b border-gray-200 px-6 py-2 flex-shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0 mr-1">
                Segmen:
              </span>
              {segments.map((seg, idx) => (
                <button
                  key={seg.segment_id}
                  onClick={() => { stopPlayback(); setActiveSegmentIdx(idx); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                    idx === activeSegmentIdx
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  #{idx + 1}
                  <span className="ml-1 opacity-70">({seg.utterances.length})</span>
                </button>
              ))}
            </div>
          </div>

          {/* DataTable */}
          {activeSegment && (
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-4">
                {/* Segment Info */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                    <FileText size={9} className="mr-1" />
                    Segmen #{activeSegmentIdx + 1} — {activeSegment.utterances.length} kalimat
                  </Badge>
                  {activeSegment.asr_review_flag && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">
                      <AlertTriangle size={9} className="mr-1" />
                      Perlu Review
                    </Badge>
                  )}
                  <span className="text-[10px] text-gray-400 font-mono">
                    Durasi: {formatTimeShort(totalDuration)}
                  </span>
                  {playingUttIdx !== null && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] border-red-200 text-red-600 hover:bg-red-50 ml-auto"
                      onClick={stopPlayback}
                    >
                      <Square size={8} className="mr-1" /> Stop
                    </Button>
                  )}
                </div>

                {/* Waveform Timeline */}
                <WaveformTimeline
                  audioUrl={audioUrl}
                  utterances={activeSegment.utterances}
                  currentTime={currentTime}
                  duration={totalDuration}
                  playingUttIdx={playingUttIdx}
                  hoveredUttIdx={hoveredUttIdx}
                  onSeek={handleSeek}
                  onHoverUtt={setHoveredUttIdx}
                />

                {/* Table with client-side pagination */}
                {(() => {
                  const allUtts = activeSegment.utterances;
                  const totalUtts = allUtts.length;
                  const totalTablePages = Math.max(1, Math.ceil(totalUtts / TABLE_PAGE_SIZE));
                  const pageStart = (tablePage - 1) * TABLE_PAGE_SIZE;
                  const pageEnd = Math.min(pageStart + TABLE_PAGE_SIZE, totalUtts);
                  const pageUtts = allUtts.slice(pageStart, pageEnd);

                  return (
                    <>
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/80">
                              <TableHead className="w-12 text-center">#</TableHead>
                              <TableHead className="w-48">Nama Data</TableHead>
                              <TableHead className="w-28 text-center">Start</TableHead>
                              <TableHead className="w-28 text-center">End</TableHead>
                              <TableHead>Kalimat ASR</TableHead>
                              <TableHead className="w-20 text-center">Conf.</TableHead>
                              <TableHead className="w-16 text-center">Play</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pageUtts.map((utt, localIdx) => {
                              const globalIdx = pageStart + localIdx;
                              const conf = getConfidenceBadge(utt.confidence);
                              const isPlaying = playingUttIdx === globalIdx;
                              const isHovered = hoveredUttIdx === globalIdx;
                              const isOtherPlaying = playingUttIdx !== null && playingUttIdx !== globalIdx;

                              return (
                                <TableRow
                                  key={utt.id}
                                  className={`transition-colors ${
                                    isPlaying
                                      ? 'bg-teal-50/60'
                                      : isHovered
                                        ? 'bg-blue-50/40'
                                        : 'hover:bg-gray-50/50'
                                  }`}
                                  onMouseEnter={() => setHoveredUttIdx(globalIdx)}
                                  onMouseLeave={() => setHoveredUttIdx(null)}
                                >
                                  <TableCell className="text-center text-xs text-gray-400 font-mono align-top pt-3">
                                    {globalIdx + 1}
                                  </TableCell>
                                  <TableCell className="align-top pt-3">
                                    <span className="text-xs font-mono text-gray-600">
                                      INEWS_BS_XXXXXX_{(globalIdx + 1).toString().padStart(4, '0')}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center align-top pt-3">
                                    <span className="text-xs font-mono text-gray-700">{formatTimestamp(utt.start)}</span>
                                  </TableCell>
                                  <TableCell className="text-center align-top pt-3">
                                    <span className="text-xs font-mono text-gray-700">{formatTimestamp(utt.end)}</span>
                                  </TableCell>
                                  <TableCell className="align-top pt-3 max-w-sm">
                                    <ExpandableText text={utt.text} />
                                  </TableCell>
                                  <TableCell className="text-center align-top pt-3">
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${conf.color}`}>
                                      <Shield size={8} className="mr-0.5" />
                                      {(utt.confidence * 100).toFixed(0)}%
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="align-top pt-3">
                                    <div className="flex items-center justify-center">
                                      <button
                                        onClick={() => isPlaying ? stopPlayback() : playUtterance(globalIdx)}
                                        disabled={isOtherPlaying}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                          isPlaying
                                            ? 'bg-teal-600 text-white shadow-md animate-pulse'
                                            : isOtherPlaying
                                              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                              : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                                        }`}
                                        title={isPlaying ? 'Pause' : isOtherPlaying ? 'Sedang memutar lainnya' : 'Play'}
                                      >
                                        {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                                      </button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      {totalTablePages > 1 && (
                        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2.5">
                          <span className="text-xs text-gray-500">
                            Menampilkan {pageStart + 1}–{pageEnd} dari {totalUtts} kalimat
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={tablePage <= 1}
                              onClick={() => setTablePage((p) => p - 1)}
                              className="h-7 w-7 p-0"
                            >
                              <ChevronLeft size={14} />
                            </Button>
                            {Array.from({ length: totalTablePages }, (_, i) => i + 1).map((p) => (
                              <button
                                key={p}
                                onClick={() => setTablePage(p)}
                                className={`h-7 min-w-[28px] rounded text-xs font-semibold transition-colors ${
                                  p === tablePage
                                    ? 'bg-teal-600 text-white'
                                    : 'text-gray-500 hover:bg-gray-100'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={tablePage >= totalTablePages}
                              onClick={() => setTablePage((p) => p + 1)}
                              className="h-7 w-7 p-0"
                            >
                              <ChevronRight size={14} />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Segment navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeSegmentIdx <= 0}
                    onClick={() => { stopPlayback(); setActiveSegmentIdx((i) => i - 1); }}
                    className="text-xs"
                  >
                    <ChevronLeft size={14} className="mr-1" />
                    Segmen Sebelumnya
                  </Button>
                  <span className="text-xs text-gray-500">
                    Segmen {activeSegmentIdx + 1} dari {segments.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeSegmentIdx >= segments.length - 1}
                    onClick={() => { stopPlayback(); setActiveSegmentIdx((i) => i + 1); }}
                    className="text-xs"
                  >
                    Segmen Berikutnya
                    <ChevronRight size={14} className="ml-1" />
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
