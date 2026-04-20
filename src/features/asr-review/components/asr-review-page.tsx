'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  JobListDetailedResponse,
} from '@/features/pipeline/types';

// ── Helpers ────────────────────────────────────────────────────────

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function getConfidenceBadge(score: number): { color: string; label: string } {
  if (score >= 0.9) return { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Tinggi' };
  if (score >= 0.7) return { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Sedang' };
  return { color: 'bg-red-50 text-red-700 border-red-200', label: 'Rendah' };
}

function buildAudioUrl(jobId: string, segmentId: string): string {
  return `${env.API_URL}/assets/jobs/${jobId}/audio/${segmentId}.wav`;
}

// ── WAV Player ─────────────────────────────────────────────────────

function WavPlayer({ src, startTime, endTime }: { src: string; startTime?: number; endTime?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number>(0);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      cancelAnimationFrame(rafRef.current);
    } else {
      // If startTime provided, seek first
      if (startTime !== undefined) {
        audio.currentTime = startTime;
      }
      audio.play().catch(() => {});
      setIsPlaying(true);

      // If endTime provided, stop at that point
      if (endTime !== undefined) {
        const checkEnd = () => {
          if (audio.currentTime >= endTime) {
            audio.pause();
            setIsPlaying(false);
            return;
          }
          rafRef.current = requestAnimationFrame(checkEnd);
        };
        rafRef.current = requestAnimationFrame(checkEnd);
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = () => {
      setIsPlaying(false);
      cancelAnimationFrame(rafRef.current);
    };
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('ended', onEnd);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Reset when src changes
  useEffect(() => {
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, [src]);

  return (
    <div className="flex items-center justify-center">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isPlaying
            ? 'bg-teal-600 text-white shadow-md scale-105'
            : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
        }`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
      </button>
    </div>
  );
}

// ── Job Picker (when no job_id in URL) ─────────────────────────────

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

// ── Main Component ─────────────────────────────────────────────────

export function AsrReviewPage() {
  const searchParams = useSearchParams();
  const urlJobId = searchParams.get('job_id');

  const [selectedJobId, setSelectedJobId] = useState<string | null>(urlJobId);
  const [stage2Data, setStage2Data] = useState<Stage2ResultsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);

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

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    // Update URL without reload
    window.history.replaceState(null, '', `/asr-review?job_id=${jobId}`);
  };

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
  const segments = stage2Data?.results ?? [];
  const activeSegment = segments[activeSegmentIdx] ?? null;

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
                  onClick={() => setActiveSegmentIdx(idx)}
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
              <div className="p-6">
                {/* Segment Info */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
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
                    ID: {activeSegment.segment_id.slice(0, 16)}...
                  </span>
                </div>

                {/* Table */}
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
                      {activeSegment.utterances.map((utt, uttIdx) => {
                        const conf = getConfidenceBadge(utt.confidence);
                        const audioUrl = buildAudioUrl(selectedJobId, activeSegment.segment_id);

                        return (
                          <TableRow key={utt.id} className="hover:bg-gray-50/50">
                            <TableCell className="text-center text-xs text-gray-400 font-mono">
                              {uttIdx + 1}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono text-gray-600">
                                INEWS_BS_XXXXXX_{(uttIdx + 1).toString().padStart(4, '0')}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-xs font-mono text-gray-700">{formatTimestamp(utt.start)}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-xs font-mono text-gray-700">{formatTimestamp(utt.end)}</span>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-gray-800 leading-relaxed">
                                {utt.text}
                              </p>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${conf.color}`}>
                                <Shield size={8} className="mr-0.5" />
                                {(utt.confidence * 100).toFixed(0)}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <WavPlayer
                                src={audioUrl}
                                startTime={utt.start}
                                endTime={utt.end}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination-like segment navigation */}
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeSegmentIdx <= 0}
                    onClick={() => setActiveSegmentIdx((i) => i - 1)}
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
                    onClick={() => setActiveSegmentIdx((i) => i + 1)}
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
