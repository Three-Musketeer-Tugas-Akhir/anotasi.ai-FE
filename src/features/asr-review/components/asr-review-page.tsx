'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Play,
  Pause,
  FileText,
  ArrowLeft,
  ChevronLeft,
  Layers,
  Save,
  Flag,
  ShieldCheck,
  ArrowRight,
  Search,
  Headphones,
} from 'lucide-react';
import { toast } from 'sonner';
import { voiceAnnotationApi } from '../voice-annotation-api';
import { useSelectedDataset } from '@/features/dataset/context/dataset-context';
import type {
  VoiceAnnotationJob,
  VoiceAnnotationJobSummary,
  VoiceAnnotationUtterance,
} from '../voice-annotation-types';

// ── Helpers ────────────────────────────────────────────────────────

function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Highlighted Overlay Component ───────────────────────────────────

function HighlightedOverlay({
  text,
  flaggedWords,
}: {
  text: string;
  flaggedWords: string[];
}) {
  if (!flaggedWords || flaggedWords.length === 0) {
    return <span>{text}</span>;
  }

  const flaggedSet = new Set(flaggedWords.map((w) => w.toLowerCase()));
  // Split by words but preserve whitespace for exact overlapping
  const parts = text.split(/([\s\n]+)/);

  return (
    <span>
      {parts.map((part, idx) => {
        // If it's just whitespace, render it as-is
        if (/^[\s\n]+$/.test(part)) {
          return <span key={idx}>{part}</span>;
        }

        const clean = part.replace(/[^\w]/g, '').toLowerCase();
        if (clean && flaggedSet.has(clean)) {
          return (
            <span
              key={idx}
              className="bg-red-100/60 border-b-2 border-red-500 rounded-sm"
              style={{ color: 'transparent' }}
            >
              {part}
            </span>
          );
        }
        return <span key={idx} style={{ color: 'transparent' }}>{part}</span>;
      })}
    </span>
  );
}

// ── Progress Bar ───────────────────────────────────────────────────

function ProgressBar({
  clean,
  total,
  flagged,
}: {
  clean: number;
  total: number;
  flagged: number;
}) {
  const pct = total > 0 ? (clean / total) * 100 : 0;
  const allClean = flagged === 0 && total > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-700">
          Progres Validasi
        </span>
        <span className={`font-bold ${allClean ? 'text-emerald-600' : 'text-amber-600'}`}>
          {clean} / {total} OK
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            allClean
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              : 'bg-gradient-to-r from-amber-400 to-amber-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {allClean && (
        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold mt-1">
          <ShieldCheck size={14} />
          Semua kalimat telah tervalidasi (OK) — siap masuk Anotasi JBI
        </div>
      )}
    </div>
  );
}

// ── Job Picker ─────────────────────────────────────────────────────

type FilterMode = 'all' | 'flagged' | 'clean' | 'pending';

function JobPicker({ onSelectJob }: { onSelectJob: (jobId: string) => void }) {
  const { selectedDataset } = useSelectedDataset();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<VoiceAnnotationJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  useEffect(() => {
    (async () => {
      try {
        const data = await voiceAnnotationApi.getJobs({
          page: 1,
          page_size: 50,
          dataset_id: selectedDataset?.id,
        });
        setJobs(data.items);
      } catch {
        setError('Gagal memuat daftar job');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDataset?.id]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (searchQuery.trim() && !job.original_filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      const isEmpty = job.total_utterances === 0;
      const allClean = job.flagged_count === 0 && !isEmpty;
      if (filterMode === 'flagged') return !isEmpty && !allClean;
      if (filterMode === 'clean') return allClean;
      if (filterMode === 'pending') return isEmpty;
      return true;
    });
  }, [jobs, searchQuery, filterMode]);

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

  const filterOptions: { key: FilterMode; label: string; activeClass: string }[] = [
    { key: 'all', label: 'Semua Job', activeClass: 'bg-teal-600 text-white' },
    { key: 'flagged', label: 'Perlu Ditinjau', activeClass: 'bg-amber-500 text-white' },
    { key: 'clean', label: 'Selesai (OK)', activeClass: 'bg-emerald-500 text-white' },
    { key: 'pending', label: 'Menunggu Proses', activeClass: 'bg-gray-700 text-white' },
  ];

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Search & Filter Bar — replaces the centred title block */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-2">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 w-full sm:w-auto overflow-x-auto shadow-sm flex-shrink-0">
          {filterOptions.map(({ key, label, activeClass }) => (
            <button
              key={key}
              onClick={() => setFilterMode(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                filterMode === key ? activeClass : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-[240px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 shadow-sm"
          />
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-xl border border-gray-200 border-dashed">
          <FileText size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Tidak ada job yang sesuai dengan filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredJobs.map((job) => {
            const isEmpty = job.total_utterances === 0;
            const allClean = job.flagged_count === 0 && !isEmpty;
            const pct = job.total_utterances > 0
              ? Math.round((job.clean_count / job.total_utterances) * 100)
              : 0;

            return (
              <button
                key={job.job_id}
                onClick={() => onSelectJob(job.job_id)}
                title={job.original_filename}
                className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-teal-300 hover:bg-teal-50 hover:shadow-sm transition-all group flex flex-col justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-gray-800 group-hover:text-teal-700 transition-colors line-clamp-2 min-h-[40px] leading-snug">
                    {job.original_filename}
                  </p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {isEmpty ? (
                      <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500 border-gray-200">
                        <Layers size={8} className="mr-0.5" /> Menunggu Proses
                      </Badge>
                    ) : allClean ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 size={8} className="mr-0.5" /> Semua OK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">
                        <AlertTriangle size={8} className="mr-0.5" /> {job.flagged_count} Perlu Ditinjau
                      </Badge>
                    )}
                    <span className="text-[10px] text-gray-400">{job.total_utterances} kalimat</span>
                  </div>
                </div>

                <div className="mt-3">
                  {!isEmpty ? (
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all ${allClean ? 'bg-emerald-400' : 'bg-amber-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : (
                    <div className="h-1.5 mb-1.5 bg-transparent" />
                  )}
                  <div className="flex justify-between items-center text-[10px] text-gray-400">
                    <span className="font-semibold">{!isEmpty ? `${pct}% OK` : ''}</span>
                    {job.created_at && (
                      <span>
                        {new Date(job.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Utterance Row ──────────────────────────────────────────────────

function UtteranceRow({
  utterance,
  onSave,
  isSaving,
}: {
  utterance: VoiceAnnotationUtterance;
  onSave: (id: string, newText: string, isUnflagged?: boolean) => Promise<void>;
  isSaving: boolean;
}) {
  const [editText, setEditText] = useState(utterance.ground_truth_text);
  const [isDirty, setIsDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea to fit content dynamically
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
  }, [editText]);

  // Sync when parent data changes (e.g. after save)
  useEffect(() => {
    setEditText(utterance.ground_truth_text);
    setIsDirty(false);
  }, [utterance.ground_truth_text]);

  const handleChange = (val: string) => {
    setEditText(val);
    setIsDirty(val !== utterance.ground_truth_text);
  };

  const handleSave = async () => {
    await onSave(utterance.id, editText);
    setIsDirty(false);
  };

  const statusColor =
    utterance.voice_annotation_status === 'CLEAN'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : utterance.voice_annotation_status === 'FLAGGED'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-gray-50 text-gray-600 border-gray-200';

  const statusIcon =
    utterance.voice_annotation_status === 'CLEAN' ? (
      <CheckCircle2 size={10} />
    ) : utterance.voice_annotation_status === 'FLAGGED' ? (
      <AlertTriangle size={10} />
    ) : null;

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden transition-all ${
        utterance.has_flag
          ? 'border-red-200 shadow-sm shadow-red-50'
          : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-600">
            #{utterance.global_index}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            {formatTimeShort(utterance.start)} – {formatTimeShort(utterance.end)}
          </span>
          <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
            {statusIcon}
            <span className="ml-0.5">
              {utterance.voice_annotation_status === 'CLEAN' ? 'OK' : 'Perlu Ditinjau'}
            </span>
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {isDirty && (
            <span className="text-[10px] text-amber-500 font-medium">
              Belum disimpan
            </span>
          )}
          {utterance.has_flag && !isDirty && (
            <Button
              variant="default"
              size="sm"
              className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm border-none"
              disabled={isSaving}
              onClick={() => onSave(utterance.id, editText, true)}
            >
              <CheckCircle2 size={12} className="mr-1" />
              Konfirmasi: Sudah Benar
            </Button>
          )}
          {isDirty && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] border-teal-300 text-teal-700 hover:bg-teal-50 font-bold shadow-sm"
              disabled={isSaving}
              onClick={handleSave}
            >
              {isSaving ? (
                <Loader2 size={12} className="mr-1 animate-spin" />
              ) : (
                <Save size={12} className="mr-1" />
              )}
              Simpan Perbaikan
            </Button>
          )}
        </div>
      </div>

      {/* Audio Player */}
      <div className="px-4 py-2 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Headphones size={14} className="text-teal-500 shrink-0" />
          {utterance.audio_url ? (
            <audio
              src={utterance.audio_url}
              controls
              preload="metadata"
              className="w-full h-8"
            />
          ) : (
            <span className="text-xs text-gray-400 italic">Audio WAV belum tersedia</span>
          )}
        </div>
      </div>

      {/* Body: 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Left: ASR Original (read-only) */}
        <div className="p-3 space-y-1.5">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Transkripsi ASR (asli)
          </div>
          <div className="text-sm text-gray-500 leading-relaxed bg-gray-50 rounded-lg p-2.5 min-h-[52px] break-words">
            {utterance.asr_text || '–'}
          </div>
        </div>

        <div className="p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">
              Ground Truth (edit)
            </div>
          </div>
          
          <div className="relative">
            {/* Background highlight layer — scroll synced with textarea */}
            <div
              ref={overlayRef}
              className="absolute inset-0 pointer-events-none p-2.5 whitespace-pre-wrap break-words font-inherit text-sm leading-relaxed text-transparent z-0 overflow-auto"
              aria-hidden="true"
            >
              <HighlightedOverlay text={editText} flaggedWords={utterance.flagged_words} />
            </div>

            {/* Transparent Textarea — auto-resizes to content */}
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => handleChange(e.target.value)}
              onScroll={(e) => {
                if (overlayRef.current) {
                  overlayRef.current.scrollTop = e.currentTarget.scrollTop;
                }
              }}
              className="relative z-10 w-full text-sm text-gray-800 leading-relaxed bg-transparent border border-gray-200 rounded-lg p-2.5 min-h-[52px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 transition-all caret-black overflow-hidden"
            />
          </div>

          {/* Flagged words display (summary) — plain text, no badge/box */}
          {utterance.flagged_words.length > 0 && (
            <div className="flex items-start gap-1.5 mt-1.5">
              <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-[11px] text-amber-700 leading-snug">
                <span className="font-semibold">Tinjau kata:</span>{' '}
                {utterance.flagged_words.map((word, i) => (
                  <span key={word}>
                    <span className="font-medium">{word}</span>
                    {i < utterance.flagged_words.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function AsrReviewPage() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobSummary, setJobSummary] = useState<VoiceAnnotationJobSummary | null>(null);
  const [utterances, setUtterances] = useState<VoiceAnnotationUtterance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'flagged'>('all');
  const [searchText, setSearchText] = useState('');

  // ── Fetch data for selected job ──

  const fetchJobData = useCallback(async (jobId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [summary, uttData] = await Promise.all([
        voiceAnnotationApi.getJobSummary(jobId),
        voiceAnnotationApi.getUtterances(jobId),
      ]);
      setJobSummary(summary);
      setUtterances(uttData.utterances);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Gagal memuat data anotasi suara';
      setError(typeof msg === 'string' ? msg : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchJobData(selectedJobId);
    }
  }, [selectedJobId, fetchJobData]);

  // ── Save handler ──

  const handleSave = useCallback(
    async (voiceAnnotationId: string, newText: string, isUnflagged?: boolean) => {
      if (!selectedJobId) return;
      setSavingId(voiceAnnotationId);
      try {
        const result = await voiceAnnotationApi.updateGroundTruth(voiceAnnotationId, {
          ground_truth_text: newText,
          is_unflagged: isUnflagged,
        });

        // Update local state optimistically
        setUtterances((prev) =>
          prev.map((u) =>
            u.id === voiceAnnotationId
              ? {
                  ...u,
                  ground_truth_text: result.ground_truth_text,
                  flagged_words: result.flagged_words,
                  has_flag: result.has_flag,
                  voice_annotation_status: result.voice_annotation_status as VoiceAnnotationUtterance['voice_annotation_status'],
                }
              : u,
          ),
        );

        // Update job summary
        setJobSummary((prev) =>
          prev
            ? {
                ...prev,
                status: result.job_status,
                clean_count: result.job_clean_count,
                flagged_count: result.job_flagged_count,
                is_gate_passed: result.job_flagged_count === 0,
              }
            : prev,
        );
        toast.success('Ground truth tersimpan', {
          description: 'Perubahan teks berhasil disimpan.',
          position: 'top-center',
        });
      } catch (err) {
        console.error('Failed to save ground truth:', err);
        toast.error('Gagal menyimpan', {
          description: 'Terjadi kesalahan saat menyimpan ground truth.',
          position: 'top-center',
        });
      } finally {
        setSavingId(null);
      }
    },
    [selectedJobId],
  );

  // ── Filter utterances ──

  const filteredUtterances = useMemo(() => {
    let items = utterances;
    if (filterMode === 'flagged') {
      items = items.filter((u) => u.has_flag);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      items = items.filter(
        (u) =>
          u.ground_truth_text.toLowerCase().includes(q) ||
          u.asr_text.toLowerCase().includes(q) ||
          u.flagged_words.some((w) => w.toLowerCase().includes(q)),
      );
    }
    return items;
  }, [utterances, filterMode, searchText]);

  // ── No job selected → show picker ──

  if (!selectedJobId) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Volume2 size={22} className="text-teal-600" />
            Anotasi Suara
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Validasi transkripsi ASR untuk menghasilkan Ground Truth sebelum Anotasi JBI
          </p>
        </header>
        <ScrollArea className="flex-1">
          <JobPicker onSelectJob={setSelectedJobId} />
        </ScrollArea>
      </div>
    );
  }

  // ── Job selected → annotation workspace ──

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header — aligned with curation page layout */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            {/* Back button on the left */}
            <button
              onClick={() => {
                setSelectedJobId(null);
                setJobSummary(null);
                setUtterances([]);
              }}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={16} /> Kembali
            </button>

            {/* Separator */}
            <div className="w-px h-6 bg-slate-200 flex-shrink-0"></div>

            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Volume2 size={18} className="text-teal-600" />
                Anotasi Suara
              </h1>
              <p className="text-[11px] font-medium text-slate-500 truncate">
                {jobSummary?.original_filename || selectedJobId.slice(0, 8) + '...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-teal-700 border-teal-200 bg-white hover:bg-teal-50 shadow-sm font-bold"
              onClick={() => fetchJobData(selectedJobId)}
            >
              <RefreshCw size={14} className="mr-1.5" />
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
          <Button variant="outline" size="sm" onClick={() => fetchJobData(selectedJobId)}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && jobSummary && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-4 max-w-5xl mx-auto">
            {/* Progress Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <ProgressBar
                clean={jobSummary.clean_count}
                total={jobSummary.total_utterances}
                flagged={jobSummary.flagged_count}
              />
            </div>

            {/* Filter / Search Bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    filterMode === 'all'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Semua ({utterances.length})
                </button>
                <button
                  onClick={() => setFilterMode('flagged')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    filterMode === 'flagged'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <AlertTriangle size={10} className="inline mr-1" />
                  Perlu Ditinjau ({utterances.filter((u) => u.has_flag).length})
                </button>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Cari kata..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                />
              </div>

              <span className="text-[10px] text-gray-400 ml-auto">
                Menampilkan {filteredUtterances.length} dari {utterances.length} kalimat
              </span>
            </div>

            {/* Utterance List */}
            <div className="space-y-3">
              {filteredUtterances.length === 0 ? (
                <div className="p-12 text-center border border-gray-200 rounded-xl bg-white">
                  <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">
                    {filterMode === 'flagged'
                      ? 'Tidak ada kalimat yang perlu ditinjau'
                      : 'Tidak ada kalimat ditemukan'}
                  </p>
                </div>
              ) : (
                filteredUtterances.map((utt) => (
                  <UtteranceRow
                    key={utt.id}
                    utterance={utt}
                    onSave={handleSave}
                    isSaving={savingId === utt.id}
                  />
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
