'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  Clock,
  Loader2,
  RefreshCw,
  Shield,
  ChevronLeft,
  ChevronRight,
  Filter,
  Play,
  Pause,
  ExternalLink,
} from 'lucide-react';
import { env } from '@/core/config/env';
import { asrReviewApi } from '../asr-review-api';
import type { ASRReviewQueueItem } from '../asr-review-types';
import { AsrReviewDetailPanel } from './asr-review-detail-panel';

// ── Helpers ────────────────────────────────────────────────────────

function formatTimestamp(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--:--:--.---';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function getConfidenceColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 0.9) return 'text-emerald-600';
  if (score >= 0.5) return 'text-amber-600';
  return 'text-red-600';
}

function getConfidenceBg(score: number | null): string {
  if (score === null) return 'bg-gray-50 border-gray-200';
  if (score >= 0.9) return 'bg-emerald-50 border-emerald-200';
  if (score >= 0.5) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

/**
 * Derive data name from filename.
 * Example: "[FULL] HARI INI! Demo Ojol..." → "INEWS_BS_260418_0001"
 */
function deriveDataName(filename: string, index: number): string {
  // Try to extract date from filename patterns
  const dateMatch = filename.match(/(\d{2})[\s._-]?(\d{2})[\s._-]?(\d{2,4})/);
  let dateStr = 'XXXXXX';
  if (dateMatch) {
    const [, d1, d2, d3] = dateMatch;
    // Could be DD MM YY or YY MM DD, keep as-is
    dateStr = `${d1}${d2}${d3.slice(-2)}`;
  }

  // Determine BS/SB from filename
  const upperName = filename.toUpperCase();
  const isSB = upperName.includes('SIANG') || upperName.includes('PAGI');
  const typeCode = isSB ? 'SB' : 'BS';

  const seqNum = (index + 1).toString().padStart(4, '0');
  return `INEWS_${typeCode}_${dateStr}_${seqNum}`;
}

function buildAudioUrl(jobId: string, segmentId: string): string {
  return `${env.API_URL}/assets/jobs/${jobId}/audio/${segmentId}.wav`;
}

// ── WAV Player Component ───────────────────────────────────────────

function WavPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => { /* ignore autoplay block */ });
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = () => setIsPlaying(false);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    return () => {
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
    };
  }, []);

  // Reset when src changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isPlaying
            ? 'bg-teal-600 text-white'
            : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
        }`}
      >
        {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-[60px]">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-[10px] font-mono text-gray-400 flex-shrink-0 w-8">
        {duration > 0 ? `${Math.floor(duration)}s` : '--'}
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function AsrReviewPage() {
  // ── State ─────────────────────────────────────────────────────
  const [items, setItems] = useState<ASRReviewQueueItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [lowConfidenceCount, setLowConfidenceCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [lowConfidenceOnly, setLowConfidenceOnly] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch Queue ───────────────────────────────────────────────

  const fetchQueue = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await asrReviewApi.getQueue({
          page,
          page_size: pageSize,
          low_confidence_only: lowConfidenceOnly,
        });
        setItems(data.items);
        setTotalItems(data.total);
        setTotalPages(data.pages);
        setLowConfidenceCount(data.low_confidence_count);
        setError(null);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Gagal memuat antrian review';
        setError(typeof msg === 'string' ? msg : 'Gagal memuat antrian review');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, pageSize, lowConfidenceOnly],
  );

  // Load on mount + filter change
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Polling every 10s
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchQueue(true), 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchQueue]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleActionCompleted = () => {
    fetchQueue(true);
    const currentIdx = items.findIndex((i) => i.review_id === selectedReviewId);
    if (currentIdx >= 0 && currentIdx < items.length - 1) {
      setSelectedReviewId(items[currentIdx + 1].review_id);
    } else if (items.length > 1) {
      setSelectedReviewId(items[0].review_id);
    } else {
      setSelectedReviewId(null);
    }
  };

  const handleFilterToggle = (checked: boolean) => {
    setLowConfidenceOnly(checked);
    setPage(1);
    setSelectedReviewId(null);
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Volume2 size={22} className="text-teal-600" />
              ASR Annotation
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Review dan validasi hasil transkripsi otomatis (Whisper ASR)
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Stats */}
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                <Clock size={10} className="mr-1" />
                {totalItems} Pending
              </Badge>
              {lowConfidenceCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                  <AlertTriangle size={10} className="mr-1" />
                  {lowConfidenceCount} Low Confidence
                </Badge>
              )}
            </div>
            {/* Filter */}
            <div className="flex items-center gap-2 border-l border-gray-200 pl-3 ml-1">
              <Filter size={12} className="text-gray-400" />
              <Label htmlFor="low-conf-toggle-dt" className="text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                Low Conf.
              </Label>
              <Switch id="low-conf-toggle-dt" checked={lowConfidenceOnly} onCheckedChange={handleFilterToggle} className="scale-75" />
            </div>
            <button onClick={() => fetchQueue()} className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-gray-100 transition-colors" title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Main: DataTable ── */}
        <div className={`${selectedReviewId ? 'flex-1' : 'flex-1'} flex flex-col overflow-hidden bg-white`}>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="text-teal-600 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertTriangle size={28} className="text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-600 mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchQueue()}>Coba Lagi</Button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 size={40} className="text-emerald-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">
                  {lowConfidenceOnly ? 'Tidak ada segmen low confidence' : 'Antrian review kosong'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {lowConfidenceOnly ? 'Coba matikan filter untuk melihat semua segmen' : 'Semua segmen telah di-review'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-52">Nama Data</TableHead>
                    <TableHead className="w-28 text-center">Start</TableHead>
                    <TableHead className="w-28 text-center">End</TableHead>
                    <TableHead>Transkrip</TableHead>
                    <TableHead className="w-20 text-center">Conf.</TableHead>
                    <TableHead className="w-44">Play WAV</TableHead>
                    <TableHead className="w-24 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const isSelected = item.review_id === selectedReviewId;
                    const dataName = deriveDataName(item.original_filename, (page - 1) * pageSize + idx);
                    const audioUrl = buildAudioUrl(item.job_id, item.segment_id);

                    return (
                      <TableRow
                        key={item.review_id}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-teal-50 border-l-2 border-l-teal-500' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedReviewId(item.review_id)}
                      >
                        <TableCell className="text-center text-xs text-gray-400 font-mono">
                          {(page - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs font-semibold text-gray-800 font-mono">{dataName}</p>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5" title={item.original_filename}>
                              {item.original_filename}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs font-mono text-gray-600">{formatTimestamp(item.asr_start)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs font-mono text-gray-600">{formatTimestamp(item.asr_end)}</span>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-800 line-clamp-2 leading-relaxed max-w-md">
                            &ldquo;{item.asr_text}&rdquo;
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getConfidenceBg(item.confidence_score)} ${getConfidenceColor(item.confidence_score)}`}>
                            <Shield size={8} className="mr-0.5" />
                            {item.confidence_score !== null ? `${Math.round(item.confidence_score * 100)}%` : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <WavPlayer src={audioUrl} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant={isSelected ? 'default' : 'outline'}
                            className={`h-7 text-[10px] ${isSelected ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReviewId(item.review_id);
                            }}
                          >
                            <ExternalLink size={10} className="mr-1" />
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-xs text-gray-500">
                Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} dari {totalItems}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-7 text-xs">
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-xs text-gray-500 font-medium">
                  Hal {page}/{totalPages}
                </span>
                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 text-xs">
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Detail Panel ── */}
        {selectedReviewId && (
          <div className="w-[480px] min-w-[480px] border-l border-gray-200 flex-shrink-0">
            <AsrReviewDetailPanel
              key={selectedReviewId}
              reviewId={selectedReviewId}
              onActionCompleted={handleActionCompleted}
            />
          </div>
        )}
      </div>
    </div>
  );
}
